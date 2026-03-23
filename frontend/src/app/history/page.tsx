"use client";

import { useEffect, useState } from "react";
import { getQueries, Query } from "@/lib/api";
import { Search, ChevronDown, Calendar, ArrowUpRight, Filter, Download } from "lucide-react";
import ConfidenceBadge from "@/components/ConfidenceBadge";
import CategoryBadge from "@/components/CategoryBadge";
import { useUser, useAuth } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

export default function HistoryPage() {
    const { isLoaded, isSignedIn, user: clerkUser } = useUser();
    const { getToken } = useAuth();

    const [queries, setQueries] = useState<Query[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        async function loadData() {
            try {
                const token = await getToken();
                const userEmail = clerkUser?.emailAddresses[0]?.emailAddress;
                // Since this page serves both users and admin depending on context, we handle roles here
                // For simplicity in this UI redesign, we follow the existing logic
                const data = await getQueries(clerkUser?.publicMetadata?.role === "admin" ? undefined : userEmail, token || undefined);
                setQueries(data);
            } catch (err) {
                console.error("Failed to load queries", err);
            } finally {
                setLoading(false);
            }
        }
        if (isLoaded && isSignedIn) {
            loadData();
        }
    }, [clerkUser, isLoaded, isSignedIn, getToken]);

    const totalQueries = queries.length;
    const avgConfidence = queries.length > 0
        ? Math.round(queries.reduce((acc, q) => acc + q.confidence, 0) / queries.length)
        : 0;

    const categoryCounts = queries.reduce((acc, q) => {
        acc[q.category] = (acc[q.category] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "None";

    const todaysCount = queries.filter(q => {
        const queryDate = new Date(q.date);
        const today = new Date();
        return queryDate.toDateString() === today.toDateString();
    }).length;

    const filteredQueries = queries.filter(q =>
        q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Nexus History</h1>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] opacity-70">Archive of deep-intelligence queries</p>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard 
                    title="Total Intelligence" 
                    value={totalQueries.toString()} 
                    subtitle="Lifetime queries" 
                    trend="+12%"
                    color="primary"
                />
                <StatsCard 
                    title="System Confidence" 
                    value={`${avgConfidence}%`} 
                    subtitle="Average accuracy" 
                    trend="+2.4%"
                    color="success"
                />
                <StatsCard 
                    title="Peak Interest" 
                    value={topCategory} 
                    subtitle="Most active sector" 
                    trend="Stable"
                    color="warning"
                />
                <StatsCard 
                    title="Today's Velocity" 
                    value={todaysCount.toString()} 
                    subtitle="24h throughput" 
                    trend="+50%"
                    color="primary"
                />
            </div>

            {/* Actions & Filters */}
            <div className="flex flex-col lg:flex-row gap-6 items-center justify-between pb-2 border-b border-white/[0.05]">
                <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto">
                    <div className="p-2 bg-white/[0.03] border border-white/[0.05] rounded-xl text-primary">
                        <Filter className="w-5 h-5" />
                    </div>
                    <FilterButton label="All Sectors" active />
                    <FilterButton label="High Confidence" />
                    <FilterButton label="Temporal Range" icon={Calendar} />
                    <div className="h-6 w-px bg-white/[0.05] mx-2 hidden sm:block" />
                    <button className="flex items-center gap-2 px-4 py-2 hover:bg-white/[0.05] rounded-xl text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all">
                        <Download className="w-4 h-4" />
                        Export Data
                    </button>
                </div>
                
                <div className="relative w-full lg:w-80 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Filter intelligence..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/[0.05] focus:border-primary/50 rounded-xl pl-11 pr-4 py-3 text-sm font-medium text-foreground placeholder:text-muted-foreground transition-all outline-none"
                    />
                </div>
            </div>

            {/* Archive Table */}
            <div className="glass rounded-[2rem] overflow-hidden shadow-2xl border border-white/[0.05]">
                <div className="overflow-x-auto scrollbar-hide">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/[0.02] border-b border-white/[0.05]">
                                <th className="px-8 py-5 text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Rank</th>
                                <th className="px-8 py-5 text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Query Intelligence</th>
                                <th className="px-8 py-5 text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Domain</th>
                                <th className="px-8 py-5 text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Reliability</th>
                                <th className="px-8 py-5 text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Source</th>
                                <th className="px-8 py-5 text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em] text-right">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-8 py-20 text-center">
                                         <div className="flex flex-col items-center gap-4">
                                            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Synchronizing Archive</p>
                                         </div>
                                    </td>
                                </tr>
                            ) : filteredQueries.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-8 py-20 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <Search className="w-10 h-10 opacity-20 mb-2" />
                                            <p className="text-sm font-bold tracking-tight">No matching intelligence found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredQueries.map((q, idx) => (
                                    <tr key={q.id} className="hover:bg-white/[0.02] transition-all group">
                                        <td className="px-8 py-4 text-[11px] font-bold text-muted-foreground/50 tabular-nums">
                                            {(filteredQueries.length - idx).toString().padStart(3, '0')}
                                        </td>
                                        <td className="px-8 py-4 max-w-md">
                                            <div className="flex items-start gap-3">
                                                <div className="p-1.5 bg-primary/10 rounded-lg translate-y-0.5">
                                                    <ArrowUpRight className="w-3 h-3 text-primary" />
                                                </div>
                                                <p className="text-sm font-bold text-foreground leading-snug group-hover:text-primary transition-colors cursor-pointer" title={q.question}>
                                                    {q.question}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-4">
                                            <CategoryBadge category={q.category} />
                                        </td>
                                        <td className="px-8 py-4">
                                            <ConfidenceBadge confidence={q.confidence} />
                                        </td>
                                        <td className="px-8 py-4 max-w-[200px]">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                                                <span className="text-xs font-semibold text-muted-foreground truncate" title={q.source}>
                                                    {q.source}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-4 text-right">
                                            <div className="text-sm font-bold text-foreground tabular-nums">
                                                {new Date(q.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </div>
                                            <div className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground/60">{new Date(q.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function StatsCard({ title, value, subtitle, trend, color }: { title: string; value: string; subtitle: string, trend: string, color: 'primary' | 'success' | 'warning' }) {
    return (
        <div className="group relative">
            <div className={cn(
                "absolute -inset-0.5 rounded-[2rem] blur opacity-0 group-hover:opacity-10 transition duration-500",
                color === 'primary' ? 'bg-primary' : color === 'success' ? 'bg-success' : 'bg-warning'
            )} />
            <div className="relative glass rounded-[1.25rem] p-6 border border-white/[0.05] hover:border-white/10 transition-all shadow-xl overflow-hidden">
                <div className={cn(
                    "absolute -right-4 -bottom-4 w-24 h-24 rounded-full blur-[40px] opacity-10",
                    color === 'primary' ? 'bg-primary' : color === 'success' ? 'bg-success' : 'bg-warning'
                )} />
                
                <div className="flex justify-between items-start mb-6">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] opacity-70">{title}</span>
                    <span className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-md",
                        color === 'primary' ? 'text-primary bg-primary/10' : color === 'success' ? 'text-success bg-success/10' : 'text-warning bg-warning/10'
                    )}>{trend}</span>
                </div>
                
                <div className="space-y-1">
                    <div className="text-3xl font-bold text-foreground tracking-tight">{value}</div>
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-[0.15em] opacity-60">{subtitle}</div>
                </div>
            </div>
        </div>
    );
}

function FilterButton({ label, icon: Icon, active }: { label: string; icon?: React.ElementType, active?: boolean }) {
    return (
        <button className={cn(
            "flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-[0.15em] transition-all shadow-sm border",
            active 
                ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                : "bg-white/[0.03] text-muted-foreground border-white/[0.05] hover:border-white/10 hover:text-foreground"
        )}>
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {label}
            {!Icon && <ChevronDown className={cn("w-3 h-3 transition-transform", active ? "rotate-180" : "opacity-50")} />}
        </button>
    );
}
