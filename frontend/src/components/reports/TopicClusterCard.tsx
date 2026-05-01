"use client";

import React, { useState, useEffect } from "react";
import {
    ChevronDown,
    Copy,
    Check,
    FileText,
    Lightbulb,
    BadgeCheck,
    Loader2,
    Zap,
    ShieldAlert,
    Activity,
    ArrowRight,
    MessageSquare,
    Layers,
    ShieldCheck,
    Target,
    Navigation,
    Scale
} from "lucide-react";
import type { TopicCluster } from "@/lib/api";
import { resolveTopic, analyzeTopicWithAI } from "@/lib/api";
import { Link001, Link002, Link004 } from "@/components/ui/skiper-ui/skiper40";
import { useAuth } from "@clerk/nextjs";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import FailureAnalysisChart from "./FailureAnalysisChart";
import InsightsAndSOPCard from "./InsightsAndSOPCard";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface TopicClusterCardProps {
    cluster: TopicCluster;
    defaultExpanded?: boolean;
    forceExpanded?: boolean;
    onResolved?: (cluster: TopicCluster, notes: string) => void;
    showResolveAction?: boolean;
}

const PRIORITY_CONFIG = {
    high: {
        color: "var(--danger)",
        label: "CRITICAL VOID",
        icon: ShieldAlert,
        bg: "var(--danger-soft)"
    },
    medium: {
        color: "var(--warning)",
        label: "STANDARD GAP",
        icon: Activity,
        bg: "var(--warning-soft)"
    },
    low: {
        color: "var(--success)",
        label: "TRACE FLUCTUATION",
        icon: Layers,
        bg: "var(--success-soft)"
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
    const [showResolve, setShowResolve] = useState(false);
    const [resolveNotes, setResolveNotes] = useState("");
    const [resolving, setResolving] = useState(false);
    const [resolveError, setResolveError] = useState<string | null>(null);

    const [internalAnalysis, setInternalAnalysis] = useState(cluster.llm_analysis);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const config = PRIORITY_CONFIG[cluster.priority] || PRIORITY_CONFIG.low;
    const confidencePct = Math.round(cluster.avg_confidence < 1 ? cluster.avg_confidence * 100 : cluster.avg_confidence);

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const lines = [
            `Topic: ${cluster.topic}`,
            `Urgency: ${cluster.urgency_score}/100`,
            `Questions: ${cluster.question_count}`,
            `Avg Confidence: ${confidencePct}%`,
            "",
            "Sample Questions:",
            ...(cluster.sample_questions?.map(q => `  - ${q}`) || []),
            "",
            `Recommendation: ${cluster.recommendation || "Pending"}`
        ];
        try {
            await navigator.clipboard.writeText(lines.join("\n"));
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch { }
    };

    const { getToken } = useAuth();
    const { member } = useCurrentMember();

    const triggerAIAnalysis = async () => {
        if (internalAnalysis || isAnalyzing) return;
        setIsAnalyzing(true);
        try {
            const token = await getToken();
            const orgId = member?.org_id ?? "";
            const result = await analyzeTopicWithAI({
                topic: cluster.topic,
                samples: cluster.sample_questions,
                question_count: cluster.question_count,
                related_documents: cluster.related_documents
            }, token || undefined, orgId);
            setInternalAnalysis(result);
        } catch (err) {
            console.error(err);
        } finally {
            setIsAnalyzing(false);
        }
    };

    useEffect(() => {
        if (expanded) triggerAIAnalysis();
    }, [expanded]);

    const confirmResolve = async () => {
        setResolving(true);
        setResolveError(null);
        try {
            const token = await getToken();
            const orgId = member?.org_id ?? "";
            await resolveTopic({ topic_name: cluster.topic, notes: resolveNotes }, token || undefined, orgId);
            onResolved?.(cluster, resolveNotes);
            setShowResolve(false);
        } catch (err) {
            setResolveError("Resolution synchronization failed.");
        } finally {
            setResolving(false);
        }
    };

    return (
        <div className="group relative">
            <motion.div
                layout
                className={cn(
                    "rounded-[2.5rem] overflow-hidden transition-all duration-700 border border-[var(--border-subtle)] bg-[var(--card-bg)] shadow-[var(--card-shadow)]",
                    expanded ? "shadow-[var(--card-shadow-lg)] border-[var(--brand)]" : "hover:border-[var(--brand-glow)]"
                )}
            >
                {/* Header Zone - Senior UI Fluid Architecture */}
                <div
                    onClick={() => setLocalExpanded(!localExpanded)}
                    className="p-[clamp(1.25rem,1.25rem+1vw,2.5rem)] cursor-pointer flex flex-col lg:flex-row lg:items-center gap-[clamp(1.5rem,1.5rem+2vw,3rem)] relative overflow-hidden transition-all duration-500"
                >
                    {/* Background Subtle Accent */}
                    <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-[0.03] transition-opacity pointer-events-none"
                        style={{ backgroundColor: config.color }}
                    />

                    {/* Left Zone: Topic & Priority - Perfectly Aligned */}
                    <div className="flex-1 flex items-center gap-[clamp(1rem,1rem+1vw,2rem)] min-w-0">
                        <div
                            className="w-[clamp(3rem,3rem+1.5vw,4.5rem)] h-[clamp(3rem,3rem+1.5vw,4.5rem)] rounded-[clamp(0.875rem,1rem,1.25rem)] flex items-center justify-center flex-shrink-0 transition-all duration-700 group-hover:scale-105 group-hover:rotate-2 shadow-sm bg-[var(--bg-secondary)] border border-[var(--border-subtle)]"
                            style={{ color: config.color }}
                        >
                            <config.icon className="w-[clamp(1.5rem,1.5rem+0.5vw,2rem)] h-[clamp(1.5rem,1.5rem+0.5vw,2rem)]" />
                        </div>

                        <div className="space-y-[clamp(0.25rem,0.5vw,0.5rem)] min-w-0">
                            <h4 className="text-[clamp(1.125rem,1.125rem+0.75vw,1.875rem)] font-bold text-[var(--text-primary)] tracking-tight line-clamp-2 group-hover:text-[var(--brand)] transition-colors duration-500 leading-tight" style={{ fontFamily: "var(--font-display)" }}>
                                {cluster.topic}
                            </h4>
                            <div className="flex flex-wrap items-center gap-[clamp(0.5rem,0.75vw,0.75rem)]">
                                <div
                                    className="px-[clamp(0.6rem,0.8vw,1rem)] py-1 rounded-full text-[clamp(0.6rem,0.65vw,0.75rem)] font-extrabold tracking-[0.15em] uppercase border shrink-0"
                                    style={{
                                        backgroundColor: `color-mix(in srgb, ${config.color} 8%, transparent)`,
                                        color: config.color,
                                        borderColor: `color-mix(in srgb, ${config.color} 15%, transparent)`
                                    }}
                                >
                                    {config.label}
                                </div>
                                <div className="flex items-center gap-1.5 px-[clamp(0.5rem,0.7vw,0.875rem)] py-1 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] shrink-0">
                                    <Target className="w-[clamp(0.7rem,0.75vw,0.875rem)] h-[clamp(0.7rem,0.75vw,0.875rem)] text-[var(--text-muted)]" />
                                    <span className="text-[clamp(0.6rem,0.65vw,0.75rem)] font-bold text-[var(--text-primary)] uppercase tracking-wider tabular-nums">{cluster.question_count} Traces</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Middle Zone: Metrics - Balanced Proportions */}
                    <div className="flex items-center gap-[clamp(1.5rem,1.5rem+3vw,4rem)] lg:px-[clamp(1.5rem,2vw,3rem)] lg:border-x border-[var(--border-subtle)] shrink-0">
                        <div className="space-y-[clamp(0.25rem,0.4vw,0.5rem)] min-w-fit">
                            <p className="text-[clamp(0.55rem,0.6vw,0.7rem)] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] opacity-60">Reliability</p>
                            <div className="flex items-center gap-[clamp(0.5rem,1vw,1rem)]">
                                <span className={cn(
                                    "text-[clamp(1.5rem,1.5rem+1vw,2.5rem)] font-bold tracking-tighter leading-none tabular-nums",
                                    confidencePct >= 80 ? "text-[var(--success)]" : confidencePct >= 60 ? "text-[var(--warning)]" : "text-[var(--danger)]"
                                )}>
                                    {confidencePct}%
                                </span>
                                <div className="hidden sm:block w-[clamp(2.5rem,3vw,4rem)] h-1 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${confidencePct}%`, backgroundColor: confidencePct >= 80 ? "var(--success)" : confidencePct >= 60 ? "var(--warning)" : "var(--danger)" }} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-[clamp(0.25rem,0.4vw,0.5rem)] min-w-[clamp(6rem,8vw,10rem)]">
                            <p className="text-[clamp(0.55rem,0.6vw,0.7rem)] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] opacity-60">Urgency Score</p>
                            <div className="flex items-center gap-[clamp(0.5rem,1vw,1rem)]">
                                <span className="text-[clamp(1.5rem,1.5rem+1vw,2.5rem)] font-bold text-[var(--text-primary)] tracking-tighter leading-none tabular-nums">{cluster.urgency_score}</span>
                                <div className="flex-1 h-1 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${cluster.urgency_score}%` }}
                                        transition={{ duration: 1.5, ease: [0.19, 1, 0.22, 1] }}
                                        className="h-full rounded-full"
                                        style={{ backgroundColor: config.color }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Zone: Actions - Compact & Professional */}
                    <div className="flex items-center justify-between lg:justify-end gap-[clamp(0.75rem,1vw,1.25rem)] shrink-0 lg:ml-auto">
                        {showResolveAction && (
                            <Button
                                onClick={(e) => { e.stopPropagation(); setShowResolve(true); e.preventDefault(); }}
                                className="flex-1 lg:flex-none rounded-[clamp(0.75rem,1vw,1.25rem)] px-[clamp(1.25rem,1.5vw,2.5rem)] py-[clamp(1rem,1.25vw,1.75rem)] h-auto text-[clamp(0.65rem,0.7vw,0.85rem)] font-bold uppercase tracking-[0.15em] bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white shadow-lg active:scale-95 gap-2"
                            >
                                <BadgeCheck className="w-[clamp(1rem,1.1vw,1.25rem)] h-[clamp(1rem,1.1vw,1.25rem)]" /> 
                                <span className="hidden sm:inline">Resolve Gap</span>
                            </Button>
                        )}
                        <div className="flex items-center gap-[clamp(0.5rem,0.75vw,1rem)]">
                            <button
                                onClick={handleCopy}
                                className="p-[clamp(0.75rem,1vw,1.125rem)] rounded-[clamp(0.75rem,1vw,1rem)] bg-[var(--bg-secondary)] border border-[var(--border-subtle)] hover:border-[var(--brand)] transition-all active:scale-90"
                            >
                                {copied ? <Check className="w-[clamp(1.125rem,1.2vw,1.375rem)] h-[clamp(1.125rem,1.2vw,1.375rem)] text-[var(--success)]" /> : <Copy className="w-[clamp(1.125rem,1.2vw,1.375rem)] h-[clamp(1.125rem,1.2vw,1.375rem)] text-[var(--text-muted)]" />}
                            </button>
                            <div className={cn("p-1 transition-transform duration-700", expanded ? "rotate-180" : "")}>
                                <ChevronDown className="w-[clamp(1.25rem,1.5vw,1.75rem)] h-[clamp(1.25rem,1.5vw,1.75rem)] text-[var(--text-muted)]" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Expanded Content Area */}
                <AnimatePresence>
                    {expanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
                            className="border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30 backdrop-blur-md"
                        >
                            <div className="p-[clamp(1.5rem,1.5rem+2vw,3rem)] space-y-[clamp(3rem,3rem+4vw,6rem)]">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-[clamp(2.5rem,2.5rem+3vw,5rem)]">
                                    {/* Interaction Samples */}
                                    <section className="space-y-[clamp(1.5rem,1.5rem+1vw,2.5rem)]">
                                        <div className="flex items-center gap-[clamp(1rem,1vw,1.25rem)]">
                                            <div className="w-[clamp(2.5rem,2.5rem+1vw,3.5rem)] h-[clamp(2.5rem,2.5rem+1vw,3.5rem)] rounded-[clamp(0.75rem,1vw,1rem)] bg-[var(--brand-soft)] border border-[var(--brand-glow)] flex items-center justify-center text-[var(--brand)]">
                                                <MessageSquare className="w-[clamp(1.25rem,1.25rem+0.5vw,1.75rem)] h-[clamp(1.25rem,1.25rem+0.5vw,1.75rem)]" />
                                            </div>
                                            <div>
                                                <h5 className="text-[clamp(0.65rem,0.7vw,0.85rem)] font-extrabold text-[var(--text-primary)] uppercase tracking-[0.25em] opacity-80">Interaction Samples</h5>
                                                <p className="text-[clamp(0.55rem,0.6vw,0.75rem)] text-[var(--text-muted)] font-bold uppercase tracking-[0.15em] mt-1 opacity-60">Direct traces from anomalous queries</p>
                                            </div>
                                        </div>
                                        <div className="space-y-[clamp(0.75rem,0.75rem+1vw,1.5rem)]">
                                            {cluster.sample_questions?.map((q, i) => (
                                                <motion.div
                                                    key={i}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: i * 0.1 }}
                                                    className="p-[clamp(1.25rem,1.25rem+1vw,2rem)] rounded-[clamp(1.25rem,1.5vw,2rem)] bg-[var(--card-bg)] border border-[var(--border-subtle)] group/item hover:border-[var(--brand-glow)] hover:shadow-lg transition-all duration-500"
                                                >
                                                    <div className="flex gap-[clamp(1rem,1vw,1.5rem)]">
                                                        <span className="text-[clamp(0.65rem,0.7vw,0.8rem)] font-black text-[var(--brand)] opacity-20 group-hover/item:opacity-100 transition-opacity tabular-nums">0{i + 1}</span>
                                                        <p className="text-[clamp(0.9375rem,0.9375rem+0.25vw,1.25rem)] text-[var(--text-secondary)] font-medium leading-relaxed italic tracking-tight">&ldquo;{q}&rdquo;</p>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </section>

                                    {/* AI Analysis & Recommendation */}
                                    <section className="space-y-[clamp(1.5rem,1.5rem+1vw,2.5rem)]">
                                        <div className="flex items-center gap-[clamp(1rem,1vw,1.25rem)]">
                                            <div className="w-[clamp(2.5rem,2.5rem+1vw,3.5rem)] h-[clamp(2.5rem,2.5rem+1vw,3.5rem)] rounded-[clamp(0.75rem,1vw,1rem)] bg-[var(--warning-soft)] border border-[var(--warning-ring)] flex items-center justify-center text-[var(--warning)]">
                                                <Lightbulb className="w-[clamp(1.25rem,1.25rem+0.5vw,1.75rem)] h-[clamp(1.25rem,1.25rem+0.5vw,1.75rem)]" />
                                            </div>
                                            <div>
                                                <h5 className="text-[clamp(0.65rem,0.7vw,0.85rem)] font-extrabold text-[var(--text-primary)] uppercase tracking-[0.25em] opacity-80">Neural Recommendation</h5>
                                                <p className="text-[clamp(0.55rem,0.6vw,0.75rem)] text-[var(--text-muted)] font-bold uppercase tracking-[0.15em] mt-1 opacity-60">Synthesized mitigation strategy</p>
                                            </div>
                                        </div>
                                        <div className="p-[clamp(2rem,2rem+2vw,4rem)] rounded-[clamp(2rem,2.5vw,3.5rem)] bg-[var(--card-bg)] border border-[var(--border-strong)] shadow-[var(--card-shadow-lg)] relative overflow-hidden group/rec min-h-[clamp(18rem,20vw+10rem,28rem)] flex flex-col justify-center transition-all duration-700">
                                            <div className="absolute top-0 right-0 w-[clamp(10rem,15vw,20rem)] h-[clamp(10rem,15vw,20rem)] bg-[var(--warning-soft)] blur-[7.5rem] opacity-20 group-hover/rec:opacity-40 transition-opacity" />
                                            <div className="relative z-10 max-w-[50rem]">
                                                <p className="text-[clamp(1.25rem,1.25rem+1vw,2.125rem)] text-[var(--text-primary)] leading-[1.5] font-bold italic tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                                                    {cluster.recommendation || "Synthesizing mitigation strategy..."}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Vector Assets */}
                                        <div className="space-y-[clamp(0.75rem,1vw,1.25rem)] pt-4">
                                            <div className="flex items-center gap-3">
                                                <ShieldCheck className="w-[clamp(1rem,1.1vw,1.25rem)] h-[clamp(1rem,1.1vw,1.25rem)] text-[var(--success)]" />
                                                <span className="text-[clamp(0.65rem,0.7vw,0.8rem)] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] opacity-60">Affiliated Vector Assets</span>
                                            </div>
                                            <div className="flex flex-wrap gap-[clamp(0.5rem,0.75vw,1rem)] max-w-[45rem]">
                                                {cluster.related_documents?.length ? cluster.related_documents.map(doc => (
                                                    <Badge key={doc} className="rounded-[clamp(0.5rem,0.75vw,1rem)] px-[clamp(0.75rem,1vw,1.5rem)] py-[clamp(0.4rem,0.5vw,0.6rem)] bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)] font-bold text-[clamp(0.55rem,0.6vw,0.7rem)] uppercase tracking-widest gap-2 hover:border-[var(--brand)] transition-colors">
                                                        <FileText className="w-[clamp(0.75rem,0.8vw,1rem)] h-[clamp(0.75rem,0.8vw,1rem)] text-[var(--brand)]" />
                                                        {doc}
                                                    </Badge>
                                                )) : (
                                                    <p className="text-[clamp(0.75rem,0.8vw,0.9375rem)] text-[var(--text-muted)] italic px-2 opacity-60">No existing documentation vectors identified for this void.</p>
                                                )}
                                            </div>
                                        </div>
                                    </section>
                                </div>

                                {/* Advanced AI Deep-Dive - Senior UI Scaling */}
                                <div className="pt-[clamp(2.5rem,2.5rem+2vw,5rem)] border-t border-[var(--border-subtle)]">
                                    <div className="flex items-center gap-[clamp(1rem,1vw,1.25rem)] mb-[clamp(2rem,2.5vw,3rem)]">
                                        <div className="w-[clamp(2.5rem,2.5rem+1vw,3.5rem)] h-[clamp(2.5rem,2.5rem+1vw,3.5rem)] rounded-[clamp(0.75rem,1vw,1rem)] bg-[var(--brand-soft)] border border-[var(--brand-glow)] flex items-center justify-center text-[var(--brand)]">
                                            <Zap className="w-[clamp(1.25rem,1.25rem+0.5vw,1.75rem)] h-[clamp(1.25rem,1.25rem+0.5vw,1.75rem)]" />
                                        </div>
                                        <div>
                                            <h5 className="text-[clamp(0.65rem,0.7vw,0.85rem)] font-extrabold text-[var(--text-primary)] uppercase tracking-[0.25em] opacity-80">Neural Deep Dive</h5>
                                            <p className="text-[clamp(0.55rem,0.6vw,0.75rem)] text-[var(--text-muted)] font-bold uppercase tracking-[0.15em] mt-1 opacity-60">Multi-modal failure analysis & SOP generation</p>
                                        </div>
                                    </div>

                                    <div className="min-h-[clamp(15rem,20vw,25rem)] relative">
                                        {isAnalyzing ? (
                                            <div className="py-[clamp(3rem,5vw,8rem)] flex flex-col items-center justify-center gap-[clamp(1.5rem,2vw,3rem)]">
                                                <div className="relative">
                                                    <div className="w-[clamp(4rem,5vw,6rem)] h-[clamp(4rem,5vw,6rem)] border-4 border-[var(--brand-soft)] border-t-[var(--brand)] rounded-full animate-spin" />
                                                    <div className="absolute inset-0 bg-[var(--brand)] blur-[2.5rem] opacity-10 animate-pulse" />
                                                </div>
                                                <div className="text-center space-y-2">
                                                    <p className="text-[clamp(0.65rem,0.7vw,0.85rem)] font-black text-[var(--brand)] uppercase tracking-[0.4em] animate-pulse">Analyzing Patterns</p>
                                                    <p className="text-[clamp(0.6rem,0.65vw,0.75rem)] text-[var(--text-muted)] font-bold uppercase tracking-widest opacity-60">Applying recursive failure logic...</p>
                                                </div>
                                            </div>
                                        ) : internalAnalysis ? (
                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-[clamp(3rem,4vw,6rem)]">
                                                <FailureAnalysisChart cluster={{ ...cluster, llm_analysis: internalAnalysis }} />
                                                <InsightsAndSOPCard cluster={{ ...cluster, llm_analysis: internalAnalysis }} />
                                            </motion.div>
                                        ) : (
                                            <div className="py-[clamp(3rem,5vw,8rem)] text-center rounded-[clamp(2rem,2.5vw,4rem)] border-2 border-dashed border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30">
                                                <div className="flex flex-col items-center gap-[clamp(1.25rem,1.5vw,2.5rem)] opacity-30 hover:opacity-50 transition-opacity">
                                                    <Scale className="w-[clamp(2.5rem,3vw,4rem)] h-[clamp(2.5rem,3vw,4rem)]" />
                                                    <p className="text-[clamp(0.65rem,0.7vw,0.85rem)] font-black uppercase tracking-[0.25em] max-w-[20rem] leading-relaxed">System parameters ready for recursive analysis</p>
                                                    <Button variant="outline" onClick={triggerAIAnalysis} className="rounded-[clamp(0.75rem,1vw,1rem)] px-[clamp(2rem,2.5vw,3.5rem)] h-auto py-[clamp(1rem,1.2vw,1.5rem)] text-[clamp(0.65rem,0.7vw,0.85rem)] font-black uppercase tracking-[0.2em] border-2 active:scale-95 transition-all">Initialize Deep Scan</Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Resolution Modal Override with God-Level UI */}
            <AnimatePresence>
                {showResolve && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-[var(--bg-overlay)] backdrop-blur-xl"
                            onClick={() => !resolving && setShowResolve(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 40 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="w-full max-w-2xl relative"
                        >
                             <div className="p-[clamp(1.5rem,1.5rem+2vw,3rem)] rounded-[clamp(2rem,2vw,3rem)] bg-[var(--card-bg)] border border-[var(--border-strong)] shadow-[0_40px_100px_rgba(0,0,0,0.4)] relative overflow-hidden max-w-[50rem] mx-auto">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--brand-glow)] blur-[6.25rem] opacity-20 pointer-events-none" />

                                <div className="flex flex-col sm:flex-row sm:items-center gap-[clamp(1rem,1vw,1.5rem)] mb-[clamp(2rem,2.5vw,3rem)] relative z-10">
                                    <div className="w-[clamp(3rem,3rem+1vw,4rem)] h-[clamp(3rem,3rem+1vw,4rem)] rounded-[clamp(1rem,1vw,1.25rem)] bg-[var(--brand-soft)] border border-[var(--brand-glow)] flex items-center justify-center text-[var(--brand)] shadow-sm">
                                        <BadgeCheck className="w-[clamp(1.5rem,1.5rem+0.5vw,2rem)] h-[clamp(1.5rem,1.5rem+0.5vw,2rem)]" />
                                    </div>
                                    <div>
                                        <h3 className="text-[clamp(1.25rem,1.25rem+1vw,2rem)] font-bold text-[var(--text-primary)] tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Finalize Trace Closure</h3>
                                        <p className="text-[clamp(0.65rem,0.7vw,0.85rem)] text-[var(--text-muted)] font-black uppercase tracking-[0.2em] mt-1 italic opacity-60">Closing Gap: {cluster.topic}</p>
                                    </div>
                                </div>

                                <div className="space-y-[clamp(1.5rem,2vw,2.5rem)] relative z-10">
                                    <div className="space-y-[clamp(0.5rem,0.6vw,0.75rem)]">
                                        <label className="text-[clamp(0.6rem,0.6vw,0.7rem)] font-black text-[var(--text-muted)] uppercase tracking-[0.3em] ml-2 opacity-60">Audit Mitigation Notes</label>
                                        <textarea
                                            value={resolveNotes}
                                            onChange={(e) => setResolveNotes(e.target.value)}
                                            rows={4}
                                            className="w-full bg-[var(--input-bg)] border border-[var(--border-default)] rounded-[clamp(1.25rem,1.5vw,2rem)] px-[clamp(1.25rem,1.5vw,2rem)] py-[clamp(1rem,1.25vw,1.5rem)] text-[clamp(0.9375rem,1rem,1.1rem)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/30 focus:outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)] transition-all resize-none font-medium leading-relaxed"
                                            placeholder="Document the corrective measures implemented to resolve this intelligence void..."
                                            disabled={resolving}
                                        />
                                    </div>

                                    {resolveError && (
                                        <div className="p-[clamp(1rem,1vw,1.5rem)] bg-[var(--danger-soft)] border border-[var(--danger-ring)] rounded-[clamp(0.75rem,0.8vw,1rem)] text-center">
                                            <p className="text-[clamp(0.65rem,0.7vw,0.8rem)] font-black text-[var(--danger)] uppercase tracking-widest">{resolveError}</p>
                                        </div>
                                    )}

                                    <div className="flex flex-col sm:flex-row justify-end gap-[clamp(0.75rem,1vw,1.25rem)] pt-2">
                                        <Button
                                            variant="secondary"
                                            onClick={() => setShowResolve(false)}
                                            disabled={resolving}
                                            className="w-full sm:w-auto h-[clamp(3.5rem,3.5rem+1vw,4rem)] px-[clamp(2rem,2.5vw,3rem)] rounded-[clamp(0.75rem,1vw,1.25rem)] text-[clamp(0.65rem,0.7vw,0.85rem)] font-black tracking-[0.2em] uppercase border-2 hover:bg-[var(--bg-secondary)]"
                                        >
                                            Abort
                                        </Button>
                                        <Button
                                            onClick={confirmResolve}
                                            disabled={resolving}
                                            className="w-full sm:w-auto h-[clamp(3.5rem,3.5rem+1vw,4rem)] px-[clamp(2.5rem,3vw,4rem)] rounded-[clamp(0.75rem,1vw,1.25rem)] bg-[var(--brand)] text-white text-[clamp(0.65rem,0.7vw,0.85rem)] font-black tracking-[0.2em] uppercase hover:bg-[var(--brand-hover)] shadow-2xl shadow-[var(--brand-soft)] active:scale-95"
                                        >
                                            {resolving ? <Loader2 className="w-[clamp(1.25rem,1.3vw,1.5rem)] h-[clamp(1.25rem,1.3vw,1.5rem)] animate-spin" /> : "Authorize Trace Closure"}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
