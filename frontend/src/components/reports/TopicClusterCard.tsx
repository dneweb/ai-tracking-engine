"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp, Copy, Check, FileText, Lightbulb, BadgeCheck, Loader2 } from "lucide-react";
import type { TopicCluster } from "@/lib/api";
import { resolveTopic, analyzeTopicWithAI } from "@/lib/api";
import FailureAnalysisChart from "./FailureAnalysisChart";
import InsightsAndSOPCard from "./InsightsAndSOPCard";

interface TopicClusterCardProps {
    cluster: TopicCluster;
    defaultExpanded?: boolean;
    forceExpanded?: boolean;
    onResolved?: (cluster: TopicCluster, notes: string) => void;
    showResolveAction?: boolean;
}

const PRIORITY_CONFIG = {
    high: {
        border: "border-l-4 border-l-red-500",
        headerBg: "bg-red-950/20",
        badge: "bg-red-500/15 text-red-400 ring-1 ring-red-500/20",
        label: "HIGH",
        meterColor: "bg-red-500",
        meterTrack: "bg-red-500/10",
    },
    medium: {
        border: "border-l-4 border-l-yellow-500",
        headerBg: "bg-yellow-950/20",
        badge: "bg-yellow-500/15 text-yellow-400 ring-1 ring-yellow-500/20",
        label: "MEDIUM",
        meterColor: "bg-yellow-500",
        meterTrack: "bg-yellow-500/10",
    },
    low: {
        border: "border-l-4 border-l-gray-500",
        headerBg: "bg-gray-800/50",
        badge: "bg-gray-500/15 text-gray-400 ring-1 ring-gray-500/20",
        label: "LOW",
        meterColor: "bg-gray-500",
        meterTrack: "bg-gray-500/10",
    },
};

export default function TopicClusterCard({
    cluster,
    defaultExpanded = false,
    forceExpanded,
    onResolved,
    showResolveAction = true,
}: TopicClusterCardProps) {
    const [localExpanded, setLocalExpanded] = useState(defaultExpanded);
    const expanded = forceExpanded !== undefined ? forceExpanded : localExpanded;

    const [copied, setCopied] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    const [showResolve, setShowResolve] = useState(false);
    const [resolveNotes, setResolveNotes] = useState("");
    const [resolving, setResolving] = useState(false);
    const [resolveError, setResolveError] = useState<string | null>(null);

    // Lazy loading state for AI analysis
    const [internalAnalysis, setInternalAnalysis] = useState(cluster.llm_analysis);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);

    useEffect(() => {
        // No-op for now
    }, [cluster]);

    const config = PRIORITY_CONFIG[cluster.priority];
    const confidencePct = Math.round(cluster.avg_confidence * 100);
    const urgencyClamped = Math.max(0, Math.min(100, cluster.urgency_score));

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const lines = [
            `Topic: ${cluster.topic}`,
            `Priority: ${config.label}`,
            `Questions: ${cluster.question_count}`,
            `Avg Confidence: ${confidencePct}%`,
            `Urgency Score: ${cluster.urgency_score}/100`,
            "",
            "Sample Questions:",
            ...(cluster.sample_questions?.length
                ? cluster.sample_questions.map((q) => `  - ${q}`)
                : ["  (none)"]),
            "",
            cluster.related_documents?.length
                ? `Related Documents: ${cluster.related_documents.join(", ")}`
                : "No related documents",
            "",
            `Recommendation: ${cluster.recommendation || "None"}`,
        ];

        try {
            await navigator.clipboard.writeText(lines.join("\n"));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* clipboard unavailable */
        }
    };

    const triggerAIAnalysis = async () => {
        if (internalAnalysis || isAnalyzing) return;

        setIsAnalyzing(true);
        setAnalysisError(null);
        try {
            const result = await analyzeTopicWithAI({
                topic: cluster.topic,
                samples: cluster.sample_questions,
                question_count: cluster.question_count,
                related_documents: cluster.related_documents
            });
            setInternalAnalysis(result);
        } catch (err) {
            setAnalysisError(err instanceof Error ? err.message : "Failed to analyze topic");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const toggleExpand = () => {
        if (forceExpanded !== undefined) return;
        const nextExpanded = !localExpanded;
        setLocalExpanded(nextExpanded);

        if (nextExpanded) {
            triggerAIAnalysis();
        }
    };

    const openResolve = (e: React.MouseEvent) => {
        e.stopPropagation();
        setResolveError(null);
        setShowResolve(true);
    };

    const confirmResolve = async () => {
        setResolving(true);
        setResolveError(null);
        try {
            await resolveTopic({
                topic_name: cluster.topic,
                notes: resolveNotes,
            });
            onResolved?.(cluster, resolveNotes);
            setShowResolve(false);
            setResolveNotes("");
        } catch (err) {
            setResolveError(err instanceof Error ? err.message : "Failed to resolve topic");
        } finally {
            setResolving(false);
        }
    };

    return (
        <div
            className={`bg-card border border-border rounded-xl overflow-hidden ${config.border} transition-all`}
        >
            {/* Header */}
            <div
                role="button"
                tabIndex={0}
                onClick={toggleExpand}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleExpand();
                    }
                }}
                className={`w-full flex items-center justify-between p-5 text-left transition-colors cursor-pointer select-none ${config.headerBg} hover:brightness-110`}
            >
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h4 className="text-base font-semibold text-white">
                            {cluster.topic}
                        </h4>
                        <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wider ${config.badge}`}
                        >
                            {config.label}
                        </span>
                    </div>

                    <p className="text-sm text-gray-400 mb-2.5">
                        {cluster.question_count}{" "}
                        {cluster.question_count === 1 ? "question" : "questions"}{" "}
                        &middot; {confidencePct}% avg confidence
                    </p>

                    <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 shrink-0 w-24">
                            Urgency: {cluster.urgency_score}/100
                        </span>
                        <div
                            className={`flex-1 h-1.5 rounded-full ${config.meterTrack} max-w-[200px]`}
                        >
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${config.meterColor}`}
                                style={{ width: `${urgencyClamped}%` }}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 ml-4 shrink-0">
                    {showResolveAction && (
                        <button
                            onClick={openResolve}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-xs text-gray-200"
                            title="Mark topic as resolved"
                        >
                            <BadgeCheck className="w-4 h-4 text-green-400" />
                            ✓ Mark Resolved
                        </button>
                    )}
                    <button
                        onClick={handleCopy}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                        title="Copy details"
                    >
                        {copied ? (
                            <Check className="w-4 h-4 text-green-400" />
                        ) : (
                            <Copy className="w-4 h-4" />
                        )}
                    </button>
                    {expanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                </div>
            </div>

            {showResolve && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    onClick={() => {
                        if (!resolving) setShowResolve(false);
                    }}
                >
                    <div
                        className="w-full max-w-md bg-card border border-border rounded-xl p-5"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-white font-semibold text-base mb-1">
                            Mark as Resolved
                        </h3>
                        <p className="text-sm text-gray-400 mb-4">
                            Topic: <span className="text-gray-200">{cluster.topic}</span>
                        </p>

                        <label className="block text-xs text-gray-500 mb-1.5">
                            Notes (optional)
                        </label>
                        <textarea
                            value={resolveNotes}
                            onChange={(e) => setResolveNotes(e.target.value)}
                            rows={3}
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-success/40 focus:border-success resize-none"
                            placeholder="What changed? Link to updated SOP, etc."
                            disabled={resolving}
                        />

                        {resolveError && (
                            <p className="text-sm text-red-400 mt-3">{resolveError}</p>
                        )}

                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                onClick={() => setShowResolve(false)}
                                disabled={resolving}
                                className="px-4 py-2 rounded-lg text-sm text-gray-200 bg-white/5 hover:bg-white/10 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmResolve}
                                disabled={resolving}
                                className="px-4 py-2 rounded-lg text-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                            >
                                {resolving ? "Saving..." : "Confirm"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Expandable Content with smooth animation */}
            <div
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={{ maxHeight: expanded ? "20000px" : "0px" }}
            >
                <div ref={contentRef} className="px-5 pb-5 pt-4 space-y-5 border-t border-dashed border-border">
                    {/* Sample Questions */}
                    <div>
                        <h5 className="text-sm font-medium text-gray-300 mb-2">
                            Sample Questions
                        </h5>
                        {cluster.sample_questions?.length > 0 ? (
                            <ul className="space-y-1.5">
                                {cluster.sample_questions.map((q, i) => (
                                    <li
                                        key={i}
                                        className="text-sm text-gray-300 flex items-start gap-2"
                                    >
                                        <span className="text-gray-500 mt-0.5 shrink-0">
                                            &bull;
                                        </span>
                                        <span>&ldquo;{q}&rdquo;</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-gray-500 italic">
                                Questions not available
                            </p>
                        )}
                    </div>

                    {/* Related Documents */}
                    <div>
                        <h5 className="text-sm font-medium text-gray-300 mb-2">
                            Related Documents
                        </h5>
                        {cluster.related_documents?.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {cluster.related_documents.map((doc) => (
                                    <span
                                        key={doc}
                                        className="inline-flex items-center gap-1.5 text-xs bg-blue-900/40 text-blue-300 px-3 py-1 rounded-full"
                                    >
                                        <FileText className="w-3 h-3" />
                                        {doc}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 italic">
                                No documents linked (tracking not enabled)
                            </p>
                        )}
                    </div>

                    {/* Recommendation */}
                    <div className="bg-white/[0.02] border border-border rounded-lg p-4">
                        <div className="flex items-start gap-2">
                            <Lightbulb className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                            <div>
                                <h5 className="text-sm font-medium text-yellow-400 mb-1">
                                    Recommendation
                                </h5>
                                {cluster.recommendation ? (
                                    <p className="text-sm text-gray-300 leading-relaxed">
                                        {cluster.recommendation}
                                    </p>
                                ) : (
                                    <p className="text-sm text-gray-500 italic">
                                        No recommendation generated
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* LLM Advanced Insights */}
                    {isAnalyzing ? (
                        <div className="mt-6 border-t border-[#3a3a3a] pt-12 pb-12 flex flex-col items-center justify-center gap-3 text-gray-400">
                            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                            <div className="text-sm font-medium">Llama 3 is analyzing root causes & drafting SOPs...</div>
                        </div>
                    ) : analysisError ? (
                        <div className="mt-6 border-t border-[#3a3a3a] pt-6 text-sm text-red-400 flex items-center gap-2">
                            <Lightbulb className="w-4 h-4" />
                            AI Analysis Failed: {analysisError}
                        </div>
                    ) : internalAnalysis ? (
                        <>
                            <FailureAnalysisChart cluster={{ ...cluster, llm_analysis: internalAnalysis }} />
                            <InsightsAndSOPCard cluster={{ ...cluster, llm_analysis: internalAnalysis }} />
                        </>
                    ) : (
                        <div className="mt-6 border-t border-[#3a3a3a] pt-6 text-sm text-gray-500 italic">
                            Expand to trigger AI Deep Discovery.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
