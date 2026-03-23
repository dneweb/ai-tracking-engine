"use client";

import { useEffect, useState } from "react";
import {
    getQueries,
    getDocuments,
    getAnalyticsStats,
    Query,
    Document,
    AnalyticsStats,
} from "@/lib/api";
import {
    TrendingUp,
    TrendingDown,
    Target,
    Zap,
    Clock,
    AlertTriangle,
    ChevronDown,
    CheckCircle2,
    ChevronRight,
    Filter,
    Activity,
} from "lucide-react";
import Sparkline from "@/components/Sparkline";
import { useAuth } from "@clerk/nextjs";
import { useRole } from "@/hooks/useRole";
import { useRouter } from "next/navigation";
import LowConfidenceTable from "@/components/analytics/LowConfidenceTable";
import DocumentStats from "@/components/analytics/DocumentStats";
import dynamic from "next/dynamic";
const ExportButton = dynamic(() => import("@/components/analytics/ExportButton"), { ssr: false });
import TimelineChart from "@/components/analytics/TimelineChart";
import { cn } from "@/lib/utils";

export default function AnalyticsPage() {
    const { getToken } = useAuth();
    const { isAdmin, isLoaded: roleLoaded } = useRole();
    const router = useRouter();

    const [queries, setQueries] = useState<Query[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [stats, setStats] = useState<AnalyticsStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (roleLoaded && !isAdmin) {
            router.push("/ask-question");
        }
    }, [roleLoaded, isAdmin, router]);

    useEffect(() => {
        async function loadData() {
            try {
                setError(null);
                const token = await getToken();
                if (token) {
                    const [queriesData, documentsData, statsData] = await Promise.all([
                        getQueries(undefined, token),
                        getDocuments(token),
                        getAnalyticsStats(30, token),
                    ]);
                    setQueries(queriesData);
                    setDocuments(documentsData);
                    setStats(statsData);
                } else {
                    setError("Authentication required. Please log in.");
                }
            } catch (error) {
                console.error("Failed to load analytics data", error);
                setError("Failed to load analytics data. Please try again.");
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [getToken]);

    const totalQueries = stats?.total_queries ?? queries.length;
    const totalDocuments = stats?.total_documents ?? documents.length;
    const formatPct = (val: number | null | undefined) => {
        if (val === null || val === undefined || isNaN(val)) return "--";
        return `${Math.round(val)}%`;
    };

    const avgConfidenceValue = stats?.avg_confidence !== undefined ? stats.avg_confidence * 100 : (queries.length > 0 ? (queries.reduce((sum, q) => sum + q.confidence, 0) / queries.length) : 0);
    const avgConfidence = formatPct(avgConfidenceValue);

    const topCategory = stats?.top_category ?? (() => {
        const cc: Record<string, number> = {};
        queries.forEach((q) => {
            cc[q.category] = (cc[q.category] || 0) + 1;
        });
        const top = Object.entries(cc).sort((a, b) => b[1] - a[1])[0];
        return top ? top[0] : "None";
    })();

    const categoryCounts: Record<string, number> = {};
    queries.forEach((q) => {
        categoryCounts[q.category] = (categoryCounts[q.category] || 0) + 1;
    });

    const sortedCategories = Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    const maxCategoryCount = Math.max(...Object.values(categoryCounts), 1);

    const highConf = queries.filter((q) => q.confidence >= 80).length;
    const medConf = queries.filter(
        (q) => q.confidence >= 60 && q.confidence < 80
    ).length;
    const lowConf = queries.filter((q) => q.confidence < 60).length;

    const totalForChart = highConf + medConf + lowConf || 1;
    const highPct = (highConf / totalForChart) * 100;
    const medPct = (medConf / totalForChart) * 100;

    const stop1 = highPct;
    const stop2 = highPct + medPct;
    const donutGradient = `conic-gradient(
    var(--color-success) 0% ${stop1}%,
    var(--color-warning) ${stop1}% ${stop2}%,
    var(--color-danger) ${stop2}% 100%
  )`;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground animate-pulse">
                    Analyzing Neural Clusters
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <AlertTriangle className="w-12 h-12 text-danger" />
                <p className="text-sm font-medium text-muted-foreground text-center max-w-md">
                    {error}
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-[32px] pb-64 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-1 text-muted-foreground font-medium text-[10px] uppercase tracking-[0.2em] mb-1">
                        Analytics <span className="text-muted-foreground/30 mx-1">/</span> <span className="text-primary font-bold">Executive Dashboard</span>
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight text-foreground line-clamp-1">
                        Intelligence Analytics
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium">
                        Neural processing metrics and knowledge base efficiency
                        analysis.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <ExportButton queries={queries} documents={documents} />
                </div>
            </div>

            {/* Core Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    icon={Target}
                    value={avgConfidence}
                    label="Accuracy"
                    trend={stats?.avg_confidence_trend ? stats.avg_confidence_trend * 100 : undefined}
                    color="primary"
                    data={queries.length > 0 ? queries.slice(-7).map(q => q.confidence * 100) : undefined}
                    totalQueries={totalQueries}
                />
                <MetricCard
                    icon={Zap}
                    value={`${totalQueries}`}
                    label="Total Queries"
                    trend={stats?.total_queries_trend ? stats.total_queries_trend * 100 : undefined}
                    color="success"
                    data={queries.length > 0 ? queries.slice(-7).map((_, i) => totalQueries - i * 10) : undefined}
                    totalQueries={totalQueries}
                />
                <MetricCard
                    icon={Clock}
                    value={`${totalDocuments}`}
                    label="Documents"
                    color="warning"
                    data={documents.length > 0 ? documents.slice(-7).map((_, i) => totalDocuments - i * 2) : undefined}
                    totalQueries={totalQueries}
                />
                <MetricCard
                    icon={AlertTriangle}
                    value={`${lowConf}`}
                    label="Low Confidence"
                    trend={lowConf > 0 ? -10 : 0}
                    color="danger"
                    data={queries.length > 0 ? queries.slice(-7).map(q => q.confidence < 60 ? 1 : 0) : undefined}
                    totalQueries={totalQueries}
                />
            </div>

            {/* Activity Cluster */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 space-y-[32px]">
                    {queries.length > 0 ? (
                        <div className="glass rounded-[2rem] p-6 shadow-2xl relative overflow-hidden h-[450px] border border-white/[0.05]">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">
                                    Temporal Intelligence Velocity
                                </h3>
                                {stats && stats.total_queries > 5 && (
                                    <div className="flex items-center gap-2 text-xs font-bold text-success bg-success/10 px-3 py-1 rounded-lg border border-success/20">
                                        <TrendingUp className="w-3 h-3" />
                                        +14.2% Growth
                                    </div>
                                )}
                            </div>
                            <TimelineChart />
                        </div>
                    ) : (
                        <div className="glass rounded-[2rem] p-8 shadow-2xl flex items-center justify-center h-[450px]">
                            <p className="text-sm text-muted-foreground">No timeline data available</p>
                        </div>
                    )}

                    <div>
                        <div className="flex items-center justify-between mb-6 px-4">
                            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">
                                Low Confidence Questions
                            </h3>
                            <button className="text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1 uppercase tracking-widest transition-colors">
                                Detailed View{" "}
                                <ChevronRight className="w-3 h-3" />
                            </button>
                        </div>
                        <LowConfidenceTable />
                    </div>
                </div>

                <div className="space-y-[32px]">
                    {/* Confidence Distribution */}
                    <div className="glass rounded-[2rem] p-6 shadow-2xl flex flex-col items-center border border-white/[0.05]">
                        <div className="w-full text-left mb-10">
                            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">
                                Reliability Spectrum
                            </h3>
                        </div>
                        {queries.length > 0 ? (
                            <>
                                <div className="relative w-56 h-56 mb-10">
                                    <div className="absolute inset-0 rounded-full blur-[20px] opacity-20">
                                        {/* Background gradient for the donut chart */}
                                    </div>
                                    <div
                                        className="w-full h-full rounded-full ring-8 ring-white/[0.05] shadow-2xl relative z-10"
                                        style={{
                                            background:
                                                sortedCategories.length > 0
                                                    ? donutGradient
                                                    : "rgba(255,255,255,0.05)",
                                        }}
                                    />
                                    <div className="absolute inset-8 bg-[#0A0A0B] rounded-full flex flex-col items-center justify-center z-20 border border-white/[0.05] shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
                                        <span className={cn(
                                            "text-3xl font-bold",
                                            avgConfidence === "--" ? "text-muted-foreground/40" : "text-foreground"
                                        )}>
                                            {avgConfidence}
                                        </span>
                                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-1 text-center px-4">
                                            Mean Accuracy
                                        </span>
                                    </div>
                                </div>
                                <div className="w-full space-y-4 px-4 pb-4">
                                    <LegendItem
                                        color="bg-success"
                                        label="High Precision (80%+)"
                                        count={highConf}
                                        pct={totalForChart > 1 ? Math.round((highConf / totalForChart) * 100) : null}
                                    />
                                    <LegendItem
                                        color="bg-warning"
                                        label="Standard (60-79%)"
                                        count={medConf}
                                        pct={totalForChart > 1 ? Math.round((medConf / totalForChart) * 100) : null}
                                    />
                                    <LegendItem
                                        color="bg-danger"
                                        label="Low Confidence (< 60%)"
                                        count={lowConf}
                                        pct={totalForChart > 1 ? Math.round((lowConf / totalForChart) * 100) : null}
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-16">
                                <p className="text-sm text-muted-foreground">No query data available</p>
                            </div>
                        )}
                    </div>

                    {/* Sector Distribution */}
                    <div className="glass rounded-[2rem] p-6 shadow-2xl border border-white/[0.05]">
                        <div className="w-full text-left mb-8">
                            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">
                                Intelligence Sectoring
                            </h3>
                        </div>
                        <div className="space-y-6">
                            {sortedCategories.length > 0 ? (
                                sortedCategories.map(([cat, count]) => (
                                    <div key={cat} className="space-y-2">
                                        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                                            <span className="text-foreground">{cat}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-primary/70">{Math.round((count / (queries.length || 1)) * 100)}%</span>
                                                <span className="text-muted-foreground/50 h-3 w-[1px] bg-white/10" />
                                                <span className="text-muted-foreground">
                                                    {count} Hits
                                                </span>
                                            </div>
                                        </div>
                                        <div className="h-2 bg-white/[0.03] rounded-full overflow-hidden border border-white/[0.05]">
                                            <div
                                                className="h-full bg-gradient-to-r from-primary to-primary-hover rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(139,92,246,0.3)]"
                                                style={{
                                                    width: `${(count / maxCategoryCount) * 100}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-sm text-muted-foreground">No category data available</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Knowledge Performance */}
            <div className="space-y-[32px]">
                <div className="flex items-center gap-3 px-4">
                    <div className="p-2 bg-primary/10 rounded-xl">
                        <Activity className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-foreground">
                            Knowledge Source Efficiency
                        </h2>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-0.5 opacity-70">
                            Performance metrics per document cluster
                        </p>
                    </div>
                </div>
                <DocumentStats />
            </div>
        </div>
    );
}

function MetricCard({
    icon: Icon,
    value,
    label,
    trend,
    color,
    data,
    totalQueries,
}: {
    icon: React.ElementType;
    value: string;
    label: string;
    trend?: number;
    color: "primary" | "success" | "warning" | "danger";
    data?: number[];
    totalQueries?: number;
}) {
    const isPositive = (trend ?? 0) > 0;
    const isZero = (trend ?? 0) === 0;

    return (
        <div className="group relative">
            <div
                className={cn(
                    "absolute -inset-0.5 rounded-[2rem] blur opacity-0 group-hover:opacity-10 transition duration-500",
                    color === "primary"
                        ? "bg-primary"
                        : color === "success"
                            ? "bg-success"
                            : "bg-warning"
                )}
            />
            <div className="relative glass rounded-[2rem] p-6 border border-white/[0.05] hover:border-white/10 transition-all shadow-xl overflow-hidden min-h-[160px] flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                    <div
                        className={cn(
                            "p-3 rounded-xl ring-1 ring-white/10 shadow-inner group-hover:scale-110 transition-transform duration-300",
                            color === "primary"
                                ? "bg-primary/10 text-primary"
                                : color === "success"
                                    ? "bg-success/10 text-success"
                                    : "bg-warning/10 text-warning"
                        )}
                    >
                        <Icon className="w-5 h-5" />
                    </div>
                    {!isZero && (totalQueries ?? 0) > 5 && (
                        <div
                            className={cn(
                                "flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border",
                                isPositive
                                    ? "text-success bg-success/10 border-success/20"
                                    : "text-danger bg-danger/10 border-danger/20"
                            )}
                        >
                            {isPositive ? (
                                <TrendingUp className="w-3 h-3" />
                            ) : (
                                <TrendingDown className="w-3 h-3" />
                            )}
                            {Math.abs(trend ?? 0).toFixed(1)}%
                        </div>
                    )}
                </div>

                <div>
                    <div className="flex items-end justify-between mb-2">
                        <div className="space-y-1">
                            <div className="text-3xl font-bold tracking-tight text-foreground">
                                {value}
                            </div>
                            <div className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] opacity-70">
                                {label}
                            </div>
                        </div>
                        {data && (
                            <div className="pb-1 opacity-50 group-hover:opacity-100 transition-opacity">
                                <Sparkline
                                    data={data}
                                    width={80}
                                    height={30}
                                    color={
                                        color === "primary"
                                            ? "#8B5CF6"
                                            : color === "success"
                                                ? "#10B981"
                                                : color === "warning"
                                                    ? "#F59E0B"
                                                    : "#EF4444"
                                    }
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function LegendItem({
    color,
    label,
    count,
    pct,
}: {
    color: string;
    label: string;
    count: number;
    pct: number | null;
}) {
    const formatPctLegend = (val: number | null) => {
        if (val === null || isNaN(val)) return "--";
        return `${val}%`;
    };

    return (
        <div className="group flex items-center justify-between text-[11px] font-bold uppercase tracking-widest p-2 rounded-xl hover:bg-white/[0.02] transition-colors">
            <div className="flex items-center gap-3">
                <span
                    className={cn(
                        "w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.4)] border border-white/20",
                        color
                    )}
                />
                <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                    {label}
                </span>
            </div>
            <div className="flex items-center gap-4">
                <span className="text-foreground/40 tabular-nums">
                    {count} Hits
                </span>
                <span className="text-foreground w-8 text-right tabular-nums">
                    {formatPctLegend(pct)}
                </span>
            </div>
        </div>
    );
}
