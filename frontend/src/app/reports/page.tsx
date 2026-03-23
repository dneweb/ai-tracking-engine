"use client";

import { useState, useCallback } from "react";
import {
    AlertTriangle,
    ChevronsUpDown,
    Clock,
    Search,
    Download,
    Sparkles,
    Filter,
    ArrowRight,
    CheckCircle2,
    Activity,
    Loader2,
    RefreshCw,
    PartyPopper,
} from "lucide-react";
import ReportFilters from "@/components/reports/ReportFilters";
import ExecutiveSummaryCard from "@/components/reports/ExecutiveSummaryCard";
import TopicClusterCard from "@/components/reports/TopicClusterCard";
import TopicClusterSkeleton from "@/components/reports/TopicClusterSkeleton";
import { exportSOPReportPdf, getSOPReport } from "@/lib/api";
import type { SOPReport, TopicCluster } from "@/lib/api";
import { useAuth } from "@clerk/nextjs";
import { useRole } from "@/hooks/useRole";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

export default function ReportsPage() {
    const { getToken } = useAuth();
    const { isAdmin, isLoaded } = useRole();
    const router = useRouter();

    const [report, setReport] = useState<SOPReport | null>(null);
    const [loading, setLoading] = useState(false);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showResolvedTopics, setShowResolvedTopics] = useState(false);
    const [resolvedLocal, setResolvedLocal] = useState<Array<{ cluster: TopicCluster; notes: string; resolvedAt: string }>>([]);

    const [days, setDays] = useState(30);
    const [confidenceThreshold, setConfidenceThreshold] = useState(0.6);
    const [minClusterSize, setMinClusterSize] = useState(2);

    useEffect(() => {
        if (isLoaded && !isAdmin) {
            router.push("/ask-question");
        }
    }, [isLoaded, isAdmin, router]);

    const [filtersChanged, setFiltersChanged] = useState(false);
    const [globalExpand, setGlobalExpand] = useState<boolean | undefined>(undefined);

    const handleFilterChange = <T,>(setter: (v: T) => void) => (value: T) => {
        setter(value);
        if (report) setFiltersChanged(true);
    };

    const generateReport = useCallback(async () => {
        setLoading(true);
        setError(null);
        setFiltersChanged(false);
        setGlobalExpand(undefined);
        setResolvedLocal([]);
        try {
            const token = await getToken();
            const data = await getSOPReport({
                days,
                confidence_threshold: confidenceThreshold,
                min_cluster_size: minClusterSize,
            }, token || undefined);
            setReport(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to generate report");
        } finally {
            setLoading(false);
        }
    }, [days, confidenceThreshold, minClusterSize, getToken]);

    const downloadPdf = useCallback(async () => {
        setPdfLoading(true);
        setError(null);
        try {
            const token = await getToken();
            const blob = await exportSOPReportPdf({
                days,
                confidence_threshold: confidenceThreshold,
                min_cluster_size: minClusterSize,
            }, token || undefined);

            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "sop-report.pdf";
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Export failed:", err);
            alert("Failed to download PDF. The backend might not have reportlab installed.");
        } finally {
            setPdfLoading(false);
        }
    }, [days, confidenceThreshold, minClusterSize, getToken]);

    const handleResolved = useCallback((cluster: TopicCluster, notes: string) => {
        setResolvedLocal((prev) => [
            { cluster, notes, resolvedAt: new Date().toISOString() },
            ...prev,
        ]);

        setReport((prev) => {
            if (!prev) return prev;
            const nextClusters = prev.clusters.filter((c) => c.cluster_id !== cluster.cluster_id);
            const nextSummary = {
                ...prev.summary,
                clusters_identified: Math.max(0, prev.summary.clusters_identified - 1),
                high_priority_count: Math.max(0, prev.summary.high_priority_count - (cluster.priority === "high" ? 1 : 0)),
                medium_priority_count: Math.max(0, prev.summary.medium_priority_count - (cluster.priority === "medium" ? 1 : 0)),
                low_priority_count: Math.max(0, prev.summary.low_priority_count - (cluster.priority === "low" ? 1 : 0)),
            };
            return { ...prev, clusters: nextClusters, summary: nextSummary };
        });
    }, []);

    const highClusters = report?.clusters.filter((c) => c.priority === "high") ?? [];
    const mediumClusters = report?.clusters.filter((c) => c.priority === "medium") ?? [];
    const lowClusters = report?.clusters.filter((c) => c.priority === "low") ?? [];
    const totalClusters = report?.summary.clusters_identified ?? 0;

    function formatGeneratedAt(iso: string): string {
        try {
            const d = new Date(iso);
            return d.toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
            });
        } catch {
            return iso;
        }
    }

    function renderClusterSection(
        clusters: TopicCluster[],
        title: string,
        dotColor: string,
        titleColor: string,
        defaultExpanded: boolean,
    ) {
        if (clusters.length === 0) return null;
        return (
            <section className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <h2 className={cn("text-sm font-bold uppercase tracking-[0.2em] flex items-center gap-3", titleColor)}>
                        <span className={cn("w-2 h-2 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.2)]", dotColor)} />
                        {title}
                        <span className="opacity-40 text-xs">({clusters.length})</span>
                    </h2>
                    <div className="h-px flex-1 bg-white/[0.05] mx-6" />
                </div>
                <div className="grid grid-cols-1 gap-4">
                    {clusters.map((c) => (
                        <TopicClusterCard
                            key={c.cluster_id}
                            cluster={c}
                            defaultExpanded={defaultExpanded}
                            forceExpanded={globalExpand}
                            onResolved={handleResolved}
                        />
                    ))}
                </div>
            </section>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Deep Reports</h1>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] opacity-70">Automated analysis of knowledge efficiency</p>
                </div>
                
                <div className="flex items-center gap-3">
                    {report && (
                        <button
                            onClick={downloadPdf}
                            disabled={loading || pdfLoading}
                            className="group flex items-center gap-2.5 px-6 py-3.5 bg-white/[0.03] border border-white/[0.05] hover:border-white/10 hover:bg-white/[0.06] disabled:opacity-50 disabled:cursor-not-allowed text-foreground text-xs font-bold uppercase tracking-widest rounded-2xl transition-all shadow-xl"
                        >
                            {pdfLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Download className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                            )}
                            {pdfLoading ? "Processing" : "Export Report"}
                        </button>
                    )}
                    <button
                        onClick={generateReport}
                        disabled={loading || pdfLoading}
                        className="group flex items-center gap-2.5 px-8 py-3.5 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-widest rounded-2xl transition-all shadow-2xl shadow-primary/20"
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4 group-rotate-180 transition-transform duration-500" />
                        )}
                        {loading ? "Calculating..." : "Sync Analysis"}
                    </button>
                </div>
            </div>

            {/* Filter Hub */}
            <div className="glass rounded-[2rem] p-8 shadow-2xl border border-white/[0.05] relative overflow-hidden group/filters">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover/filters:opacity-10 transition-opacity">
                    <Filter className="w-24 h-24" />
                </div>
                <div className="relative z-10">
                    <ReportFilters
                        days={days}
                        confidenceThreshold={confidenceThreshold}
                        minClusterSize={minClusterSize}
                        onDaysChange={handleFilterChange(setDays)}
                        onThresholdChange={handleFilterChange(setConfidenceThreshold)}
                        onMinClusterSizeChange={handleFilterChange(setMinClusterSize)}
                        disabled={loading}
                    />
                </div>
            </div>

            {/* Warning Layer */}
            {filtersChanged && report && !loading && (
                <div className="bg-warning/10 border border-warning/20 rounded-2xl px-6 py-4 flex items-center justify-between gap-4 animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-warning" />
                        <p className="text-xs font-bold uppercase tracking-widest text-warning">Stale Intelligence: Parameters have shifted</p>
                    </div>
                    <button
                        onClick={generateReport}
                        className="text-[10px] font-bold text-warning hover:text-warning/80 bg-warning/10 px-4 py-2 rounded-xl border border-warning/20 uppercase tracking-widest transition-all"
                    >
                        Re-Synchronize
                    </button>
                </div>
            )}

            {/* Action Pipeline */}
            {loading && (
                <div className="space-y-8 py-10">
                    <div className="flex flex-col items-center gap-6 max-w-md mx-auto text-center">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Intelligence Engine Active</p>
                            <p className="text-sm font-medium text-muted-foreground">Synthesizing data clusters and identifying critical documentation gaps...</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-6 max-w-[1000px] mx-auto opacity-40">
                        {[1, 2, 3].map((i) => (
                            <TopicClusterSkeleton key={i} />
                        ))}
                    </div>
                </div>
            )}

            {/* Error Interface */}
            {error && !loading && (
                <div className="glass border border-danger/20 rounded-3xl p-12 text-center max-w-2xl mx-auto shadow-2xl">
                    <div className="w-16 h-16 bg-danger/10 text-danger rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold font-display text-foreground mb-2">Analysis Pipeline Failed</h3>
                    <p className="text-muted-foreground text-sm mb-8 leading-relaxed font-medium">
                        The intelligence engine encountered an exception while processing clusters. 
                        Error details: <code className="text-danger bg-danger/5 px-2 py-0.5 rounded ml-1">{error}</code>
                    </p>
                    <button
                        onClick={generateReport}
                        className="inline-flex items-center gap-2 px-8 py-3.5 bg-danger/10 hover:bg-danger/20 text-danger rounded-2xl text-xs font-bold uppercase tracking-widest border border-danger/20 transition-all"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Retry Execution
                    </button>
                </div>
            )}

            {/* Intelligence Results */}
            {report && !loading && !error && (
                <div className="space-y-12">
                    <div className="flex flex-wrap items-center justify-between gap-6 pb-6 border-b border-white/[0.05]">
                        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                            <div className="flex items-center gap-2.5">
                                <div className="p-1.5 bg-white/[0.03] border border-white/[0.05] rounded-lg">
                                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Calculated</span>
                                    <span className="text-xs font-bold text-foreground tabular-nums">{formatGeneratedAt(report.generated_at)}</span>
                                </div>
                            </div>
                            <div className="w-px h-8 bg-white/[0.05] hidden sm:block" />
                            <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Parameters</span>
                                <span className="text-xs font-bold text-foreground tabular-nums">
                                    {report.period} &middot; &lt;{Math.round(report.filters_used.confidence_threshold * 100)}% Conf &middot; Min {report.filters_used.min_cluster_size}
                                </span>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    if (globalExpand === true) setGlobalExpand(false);
                                    else if (globalExpand === false) setGlobalExpand(undefined);
                                    else setGlobalExpand(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all"
                            >
                                <ChevronsUpDown className="w-3.5 h-3.5" />
                                {globalExpand === true ? "Collapse All" : globalExpand === false ? "Reset View" : "Expand All"}
                            </button>
                        </div>
                    </div>

                    {report.summary.total_low_confidence === 0 ? (
                        <div className="glass border border-success/20 rounded-[3rem] p-20 text-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-10 opacity-5">
                                <PartyPopper className="w-40 h-40 text-success" />
                            </div>
                            <div className="relative z-10">
                                <div className="w-20 h-20 bg-success/10 text-success rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-success/10">
                                    <CheckCircle2 className="w-10 h-10" />
                                </div>
                                <h3 className="text-3xl font-bold font-display text-foreground mb-4">Maximum Knowledge Coverage</h3>
                                <p className="text-muted-foreground max-w-xl mx-auto text-base leading-relaxed font-medium">
                                    Extraordinary result. All <span className="text-success font-bold">{report.summary.total_queries_in_period}</span> queries in the 
                                    {report.period.toLowerCase()} have been processed with high-reliability signatures.
                                </p>
                            </div>
                        </div>
                    ) : totalClusters === 0 ? (
                        <div className="glass border border-warning/20 rounded-[3rem] p-20 text-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-10 opacity-5">
                                <Search className="w-40 h-40 text-warning" />
                            </div>
                            <div className="relative z-10">
                                <div className="w-20 h-20 bg-warning/10 text-warning rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-warning/10">
                                    <Activity className="w-10 h-10" />
                                </div>
                                <h3 className="text-3xl font-bold font-display text-foreground mb-4">{report.summary.total_low_confidence} Diffuse Signals Detected</h3>
                                <p className="text-muted-foreground max-w-xl mx-auto text-base leading-relaxed font-medium mb-8">
                                    Low-confidence questions were found, but they don&apos;t yet form significant clusters based on current settings.
                                </p>
                                <div className="flex justify-center gap-4">
                                     <div className="px-5 py-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.05] text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                                        Try minimum size 1
                                     </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-16">
                            {/* Summary Metrics */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 px-2">
                                    <div className="p-2 bg-primary/10 rounded-xl">
                                        <Activity className="w-5 h-5 text-primary" />
                                    </div>
                                    <h2 className="text-xl font-bold tracking-tight text-foreground">Executive Summary &mdash; {report.period}</h2>
                                </div>
                                <ExecutiveSummaryCard
                                    summary={report.summary}
                                    productivity={report.productivity_impact}
                                />
                            </div>

                            {/* Main Clusters */}
                            <div className="space-y-12">
                                {renderClusterSection(highClusters, "Critical Voids", "bg-danger", "text-danger", true)}
                                {renderClusterSection(mediumClusters, "Standard Gaps", "bg-warning", "text-warning", false)}
                                {renderClusterSection(lowClusters, "Trace Fluctuations", "bg-primary", "text-primary", false)}
                            </div>

                            {/* Resolution Archive Toggle */}
                            <div className="flex justify-center pt-8">
                                <button
                                    onClick={() => setShowResolvedTopics(!showResolvedTopics)}
                                    className={cn(
                                        "group flex items-center gap-3 px-8 py-4 rounded-3xl text-sm font-bold uppercase tracking-[0.2em] transition-all",
                                        showResolvedTopics 
                                            ? "bg-foreground text-background" 
                                            : "bg-white/[0.03] border border-white/[0.05] text-muted-foreground hover:text-foreground hover:border-white/10"
                                    )}
                                >
                                    {showResolvedTopics ? "Close Archive" : "Intellectual Resolution Archive"}
                                    <span className="opacity-40 tabular-nums">({resolvedLocal.length})</span>
                                    <ArrowRight className={cn("w-4 h-4 transition-transform", showResolvedTopics ? "rotate-180" : "group-hover:translate-x-1")} />
                                </button>
                            </div>

                            {showResolvedTopics && resolvedLocal.length > 0 && (
                                <section className="space-y-8 pt-4 animate-in fade-in slide-in-from-bottom-4">
                                    <div className="flex items-center gap-3 px-2">
                                        <div className="p-2 bg-success/10 rounded-xl">
                                            <CheckCircle2 className="w-5 h-5 text-success" />
                                        </div>
                                        <h2 className="text-xl font-bold tracking-tight text-foreground">Recently Rectified</h2>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 opacity-80">
                                        {resolvedLocal.map((r) => (
                                            <TopicClusterCard
                                                key={`resolved-${r.cluster.cluster_id}-${r.resolvedAt}`}
                                                cluster={r.cluster}
                                                defaultExpanded={false}
                                                showResolveAction={false}
                                            />
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
