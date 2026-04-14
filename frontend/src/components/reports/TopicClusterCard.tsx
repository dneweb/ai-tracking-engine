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
import { useAuth } from "@clerk/nextjs";
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
        } catch {}
    };

    const { getToken } = useAuth();

    const triggerAIAnalysis = async () => {
        if (internalAnalysis || isAnalyzing) return;
        setIsAnalyzing(true);
        try {
            const token = await getToken();
            const result = await analyzeTopicWithAI({
                topic: cluster.topic,
                samples: cluster.sample_questions,
                question_count: cluster.question_count,
                related_documents: cluster.related_documents
            }, token || undefined);
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
            await resolveTopic({ topic_name: cluster.topic, notes: resolveNotes });
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
                    "rounded-[40px] overflow-hidden transition-all duration-700 border border-[var(--border-subtle)] bg-[var(--card-bg)] shadow-[var(--card-shadow)]",
                    expanded ? "shadow-[var(--card-shadow-lg)] border-[var(--brand)]" : "hover:border-[var(--brand-glow)]"
                )}
            >
                {/* Header Zone */}
                <div 
                    onClick={() => setLocalExpanded(!localExpanded)}
                    className="p-8 md:p-10 cursor-pointer flex flex-col lg:flex-row lg:items-center gap-8 relative overflow-hidden"
                >
                    {/* Background Subtle Accent */}
                    <div 
                        className="absolute inset-0 opacity-0 group-hover:opacity-[0.03] transition-opacity pointer-events-none"
                        style={{ backgroundColor: config.color }}
                    />

                    {/* Left Zone: Topic & Priority */}
                    <div className="flex-1 flex items-start gap-6 min-w-0">
                        <div 
                            className="w-16 h-16 rounded-[24px] flex items-center justify-center flex-shrink-0 transition-all duration-700 group-hover:scale-110 group-hover:rotate-3 shadow-sm bg-[var(--bg-secondary)]" 
                            style={{ color: config.color, borderColor: `color-mix(in srgb, ${config.color} 20%, transparent)`, borderWidth: '1px' }}
                        >
                            <config.icon className="w-8 h-8" />
                        </div>
                        
                        <div className="space-y-3 min-w-0">
                            <h4 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] tracking-tight truncate group-hover:text-[var(--brand)] transition-colors duration-500" style={{ fontFamily: "var(--font-display)" }}>
                                {cluster.topic}
                            </h4>
                            <div className="flex flex-wrap items-center gap-3">
                                <div 
                                    className="px-4 py-1.5 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase border"
                                    style={{ 
                                        backgroundColor: `color-mix(in srgb, ${config.color} 8%, transparent)`, 
                                        color: config.color, 
                                        borderColor: `color-mix(in srgb, ${config.color} 15%, transparent)` 
                                    }}
                                >
                                    {config.label}
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                                    <Target className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                    <span className="text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-wider">{cluster.question_count} Traces</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Middle Zone: Metrics */}
                    <div className="flex flex-wrap items-center gap-10 lg:px-10 lg:border-x border-[var(--border-subtle)]">
                        <div className="space-y-2">
                            <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">Reliability</p>
                            <div className="flex items-center gap-3">
                                <span className={cn(
                                    "text-2xl font-bold tracking-tight",
                                    confidencePct >= 80 ? "text-[var(--success)]" : confidencePct >= 60 ? "text-[var(--warning)]" : "text-[var(--danger)]"
                                )}>
                                    {confidencePct}%
                                </span>
                                <div className="w-12 h-1.5 rounded-full bg-[var(--bg-secondary)] overflow-hidden border border-[var(--border-subtle)]">
                                    <div className="h-full rounded-full" style={{ width: `${confidencePct}%`, backgroundColor: confidencePct >= 80 ? "var(--success)" : confidencePct >= 60 ? "var(--warning)" : "var(--danger)" }} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 min-w-[120px]">
                            <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">Urgency Score</p>
                            <div className="flex items-center gap-3">
                                <span className="text-2xl font-bold text-[var(--text-primary)] tracking-tight tabular-nums">{cluster.urgency_score}</span>
                                <div className="flex-1 h-1.5 rounded-full bg-[var(--bg-secondary)] overflow-hidden border border-[var(--border-subtle)]">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${cluster.urgency_score}%` }}
                                        transition={{ duration: 1.5, ease: [0.19, 1, 0.22, 1], delay: 0.2 }}
                                        className="h-full rounded-full" 
                                        style={{ backgroundColor: config.color }} 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Zone: Actions */}
                    <div className="flex items-center gap-4">
                        {showResolveAction && (
                            <Button 
                                onClick={(e) => { e.stopPropagation(); setShowResolve(true); e.preventDefault(); }}
                                className="rounded-2xl px-6 py-6 h-auto text-[10px] font-bold uppercase tracking-widest bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white shadow-lg active:scale-95 gap-2"
                            >
                                <BadgeCheck className="w-4 h-4" /> Resolve Gap
                            </Button>
                        )}
                        <button 
                            onClick={handleCopy}
                            className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] hover:border-[var(--brand)] transition-all active:scale-90"
                        >
                            {copied ? <Check className="w-5 h-5 text-[var(--success)]" /> : <Copy className="w-5 h-5 text-[var(--text-muted)]" />}
                        </button>
                        <div className={cn("p-2 transition-transform duration-700", expanded ? "rotate-180" : "")}>
                            <ChevronDown className="w-6 h-6 text-[var(--text-muted)]" />
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
                            <div className="p-10 md:p-16 space-y-16">
                                
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-16">
                                    {/* Interaction Samples */}
                                    <section className="space-y-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-[20px] bg-[var(--brand-soft)] border border-[var(--brand-glow)] flex items-center justify-center text-[var(--brand)]">
                                                <MessageSquare className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h5 className="text-[12px] font-extrabold text-[var(--text-primary)] uppercase tracking-[0.2em]">Interaction Samples</h5>
                                                <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-1">Direct traces from anomalous queries</p>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            {cluster.sample_questions?.map((q, i) => (
                                                <motion.div 
                                                    key={i} 
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: i * 0.1 }}
                                                    className="p-6 rounded-[28px] bg-[var(--card-bg)] border border-[var(--border-subtle)] group/item hover:border-[var(--brand-glow)] transition-all"
                                                >
                                                    <div className="flex gap-5">
                                                        <span className="text-[11px] font-bold text-[var(--brand)] opacity-20 group-hover/item:opacity-100 transition-opacity">0{i+1}</span>
                                                        <p className="text-[15px] text-[var(--text-secondary)] font-medium leading-relaxed italic">&ldquo;{q}&rdquo;</p>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </section>

                                    {/* AI Analysis & Recommendation */}
                                    <section className="space-y-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-[20px] bg-[var(--warning-soft)] border border-[var(--warning-ring)] flex items-center justify-center text-[var(--warning)]">
                                                <Lightbulb className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h5 className="text-[12px] font-extrabold text-[var(--text-primary)] uppercase tracking-[0.2em]">Neural Recommendation</h5>
                                                <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-1">Synthesized mitigation strategy</p>
                                            </div>
                                        </div>
                                        <div className="p-8 md:p-10 rounded-[40px] bg-[var(--card-bg)] border border-[var(--border-subtle)] shadow-[var(--card-shadow)] relative overflow-hidden group/rec">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--warning-soft)] blur-3xl opacity-30 group-hover/rec:opacity-60 transition-opacity" />
                                            <div className="relative z-10 space-y-8">
                                                <p className="text-lg md:text-xl text-[var(--text-primary)] leading-relaxed font-semibold italic" style={{ fontFamily: "var(--font-display)" }}>
                                                    {cluster.recommendation || "Synthesizing mitigation strategy..." }
                                                </p>
                                                <Button size="lg" className="rounded-2xl px-10 h-auto py-5 text-[11px] font-bold uppercase tracking-widest bg-[var(--warning)] hover:bg-[var(--warning)]/90 text-white shadow-xl shadow-[var(--warning-soft)] gap-2">
                                                    <Navigation className="w-4 h-4" /> Draft Correction SOP
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Vector Assets */}
                                        <div className="space-y-4 pt-4">
                                            <div className="flex items-center gap-3">
                                                <ShieldCheck className="w-4 h-4 text-[var(--success)]" />
                                                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Affiliated Vector Assets</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {cluster.related_documents?.length ? cluster.related_documents.map(doc => (
                                                    <Badge key={doc} className="rounded-xl px-4 py-2 bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)] font-bold text-[10px] uppercase tracking-wider gap-2">
                                                        <FileText className="w-3.5 h-3.5 text-[var(--brand)]" />
                                                        {doc}
                                                    </Badge>
                                                )) : (
                                                    <p className="text-[11px] text-[var(--text-muted)] italic px-2">No existing documentation vectors identified for this void.</p>
                                                )}
                                            </div>
                                        </div>
                                    </section>
                                </div>

                                {/* Advanced AI Deep-Dive */}
                                <div className="pt-16 border-t border-[var(--border-subtle)]">
                                    <div className="flex items-center gap-4 mb-10">
                                        <div className="w-12 h-12 rounded-[20px] bg-[var(--brand-soft)] border border-[var(--brand-glow)] flex items-center justify-center text-[var(--brand)]">
                                            <Zap className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h5 className="text-[12px] font-extrabold text-[var(--text-primary)] uppercase tracking-[0.2em]">Neural Deep Dive</h5>
                                            <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-1">Multi-modal failure analysis & SOP generation</p>
                                        </div>
                                    </div>

                                    <div className="min-h-[200px] relative">
                                        {isAnalyzing ? (
                                            <div className="py-20 flex flex-col items-center justify-center gap-8">
                                                <div className="relative">
                                                    <div className="w-20 h-20 border-4 border-[var(--brand-soft)] border-t-[var(--brand)] rounded-full animate-spin" />
                                                    <div className="absolute inset-0 bg-[var(--brand)] blur-[40px] opacity-10 animate-pulse" />
                                                </div>
                                                <div className="text-center space-y-2">
                                                    <p className="text-[11px] font-bold text-[var(--brand)] uppercase tracking-[0.4em] animate-pulse">Analyzing Patterns</p>
                                                    <p className="text-[12px] text-[var(--text-muted)] font-semibold uppercase tracking-widest">Applying recursive failure logic...</p>
                                                </div>
                                            </div>
                                        ) : internalAnalysis ? (
                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-16">
                                                <FailureAnalysisChart cluster={{ ...cluster, llm_analysis: internalAnalysis }} />
                                                <InsightsAndSOPCard cluster={{ ...cluster, llm_analysis: internalAnalysis }} />
                                            </motion.div>
                                        ) : (
                                            <div className="py-20 text-center rounded-[40px] border-2 border-dashed border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30">
                                                <div className="flex flex-col items-center gap-6 opacity-30">
                                                    <Scale className="w-12 h-12" />
                                                    <p className="text-[11px] font-bold uppercase tracking-[0.3em] max-w-xs leading-relaxed">System parameters ready for recursive analysis</p>
                                                    <Button variant="outline" onClick={triggerAIAnalysis} className="rounded-xl px-10 h-auto py-3 text-[10px] font-extrabold uppercase tracking-[0.2em] border-2">Initialize Deep Scan</Button>
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
                            <div className="p-10 md:p-14 rounded-[48px] bg-[var(--card-bg)] border border-[var(--border-strong)] shadow-[0_40px_100px_rgba(0,0,0,0.4)] relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--brand-glow)] blur-[100px] opacity-20 pointer-events-none" />
                                
                                <div className="flex items-center gap-6 mb-12 relative z-10">
                                    <div className="w-16 h-16 rounded-[24px] bg-[var(--brand-soft)] border border-[var(--brand-glow)] flex items-center justify-center text-[var(--brand)]">
                                        <BadgeCheck className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h3 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Finalize Trace Closure</h3>
                                        <p className="text-[12px] text-[var(--text-muted)] font-bold uppercase tracking-[0.2em] mt-1 italic">Closing Gap: {cluster.topic}</p>
                                    </div>
                                </div>

                                <div className="space-y-8 relative z-10">
                                    <div className="space-y-3">
                                        <label className="text-[11px] font-extrabold text-[var(--text-muted)] uppercase tracking-[0.3em] ml-2">Audit Mitigation Notes</label>
                                        <textarea
                                            value={resolveNotes}
                                            onChange={(e) => setResolveNotes(e.target.value)}
                                            rows={5}
                                            className="w-full bg-[var(--input-bg)] border border-[var(--border-default)] rounded-[32px] px-8 py-6 text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/30 focus:outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)] transition-all resize-none font-medium leading-[1.8]"
                                            placeholder="Document the corrective measures or neural state updates implemented to resolve this intelligence void..."
                                            disabled={resolving}
                                        />
                                    </div>

                                    {resolveError && (
                                        <div className="p-4 bg-[var(--danger-soft)] border border-[var(--danger-ring)] rounded-2xl text-center">
                                            <p className="text-[11px] font-extrabold text-[var(--danger)] uppercase tracking-widest">{resolveError}</p>
                                        </div>
                                    )}

                                    <div className="flex justify-end gap-5 pt-4">
                                        <Button 
                                            variant="secondary" 
                                            onClick={() => setShowResolve(false)} 
                                            disabled={resolving}
                                            className="h-14 px-10 rounded-2xl text-[11px] font-bold tracking-widest uppercase border-2"
                                        >
                                            Abort
                                        </Button>
                                        <Button 
                                            onClick={confirmResolve} 
                                            disabled={resolving}
                                            className="h-14 px-12 rounded-2xl bg-[var(--brand)] text-white text-[11px] font-bold tracking-widest uppercase hover:bg-[var(--brand-hover)] shadow-2xl shadow-[var(--brand-soft)]"
                                        >
                                            {resolving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Authorize Trace Closure"}
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
