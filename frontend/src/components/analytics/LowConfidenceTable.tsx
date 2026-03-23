"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown, AlertTriangle } from "lucide-react";
import { getLowConfidenceQueries } from "@/lib/api";
import type { LowConfidenceQuery } from "@/lib/api";
import { useAuth } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

type SortField = "confidence" | "date";
type SortOrder = "asc" | "desc";

export default function LowConfidenceTable() {
    const { getToken } = useAuth();
    const [queries, setQueries] = useState<LowConfidenceQuery[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [limit, setLimit] = useState(10);
    const [sortBy, setSortBy] = useState<SortField>("confidence");
    const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = await getToken();
            const data = await getLowConfidenceQueries(limit, 0.6, 0, sortBy, sortOrder, token || undefined);
            setQueries(data.queries);
            setTotal(data.total);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load data");
        } finally {
            setLoading(false);
        }
    }, [limit, sortBy, sortOrder, getToken]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const isRecent = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        return {
            bright: diffDays <= 7,
            muted: diffDays > 30
        };
    };

    const toggleSort = (field: SortField) => {
        if (sortBy === field) {
            setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
        } else {
            setSortBy(field);
            setSortOrder(field === "confidence" ? "asc" : "desc");
        }
    };

    function SortIcon({ field }: { field: SortField }) {
        if (sortBy !== field) return <ChevronsUpDown className="w-3.5 h-3.5 text-gray-600" />;
        return sortOrder === "asc" ? (
            <ChevronUp className="w-3.5 h-3.5 text-primary font-bold stroke-[3]" />
        ) : (
            <ChevronDown className="w-3.5 h-3.5 text-primary font-bold stroke-[3]" />
        );
    }

    function ConfidenceBadge({ score }: { score: number }) {
        const pct = Math.round(score * 100);
        let colorClass = "bg-yellow-500/10 text-yellow-400";
        if (pct < 30) colorClass = "bg-red-500/10 text-red-400";
        else if (pct < 50) colorClass = "bg-orange-500/10 text-orange-400";

        return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
                {pct}%
            </span>
        );
    }

    function formatDate(iso: string) {
        try {
            return new Date(iso).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
            });
        } catch {
            return iso;
        }
    }

    if (error) {
        return (
            <div className="bg-card border border-border rounded-xl p-6">
                <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
        );
    }

    return (
        <div className="glass rounded-[2rem] overflow-hidden border border-white/[0.05] shadow-2xl">
            <div className="px-6 py-5 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-400" />
                        Low Confidence Questions
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Questions with confidence below 60% &mdash; {total} total
                    </p>
                </div>
                {/* Color Legend */}
                <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-white/[0.02] px-3 py-1.5 rounded-lg border border-white/[0.05]">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        <span>Critical &lt;30%</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-orange-500" />
                        <span>Orange 30-50%</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-yellow-500" />
                        <span>Yellow 50-60%</span>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white/[0.02] text-muted-foreground border-b border-border">
                        <tr>
                            <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px] w-[45%]">Question</th>
                            <th
                                className="px-6 py-4 font-bold uppercase tracking-widest text-[10px] cursor-pointer select-none group/th"
                                onClick={() => toggleSort("confidence")}
                            >
                                <span className="inline-flex items-center gap-1 group-hover/th:text-foreground transition-colors">
                                    Confidence <SortIcon field="confidence" />
                                </span>
                            </th>
                            <th
                                className="px-6 py-4 font-bold uppercase tracking-widest text-[10px] cursor-pointer select-none group/th"
                                onClick={() => toggleSort("date")}
                            >
                                <span className="inline-flex items-center gap-1 group-hover/th:text-foreground transition-colors">
                                    Date <SortIcon field="date" />
                                </span>
                            </th>
                            <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">Related Document</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground">
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                                        <span>Synchronizing Neural Logs...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            queries.map((q) => (
                                <tr
                                    key={q.id}
                                    className="hover:bg-white/5 transition-colors cursor-pointer group"
                                    onClick={() =>
                                        setExpandedRow(expandedRow === q.id ? null : q.id)
                                    }
                                >
                                    <td className="px-6 py-5" colSpan={expandedRow === q.id ? 4 : undefined}>
                                        {expandedRow === q.id ? (
                                            <div className="space-y-3">
                                                <p className="text-white font-medium">{q.question}</p>
                                                <div className="bg-white/[0.03] border border-white/[0.05] rounded-lg p-4">
                                                    <p className="text-xs text-gray-500 mb-1">Answer</p>
                                                    <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                                                        {q.answer}
                                                    </p>
                                                </div>
                                                <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest opacity-60">
                                                    <span>Confidence: <ConfidenceBadge score={q.confidence_score} /></span>
                                                    <span>Date: {formatDate(q.created_at)}</span>
                                                    {q.retrieved_doc_title && (
                                                        <span>Document: {q.retrieved_doc_title}</span>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <span
                                                className="text-white font-medium truncate block max-w-md group-hover:text-primary transition-colors"
                                                title={q.question}
                                            >
                                                {q.question}
                                            </span>
                                        )}
                                    </td>
                                    {expandedRow !== q.id && (
                                        <>
                                            <td className="px-6 py-5">
                                                <ConfidenceBadge score={q.confidence_score} />
                                            </td>
                                            <td className={cn(
                                                "px-6 py-5 whitespace-nowrap text-xs font-medium",
                                                isRecent(q.created_at).bright ? "text-white" : isRecent(q.created_at).muted ? "text-muted-foreground/40" : "text-muted-foreground"
                                            )}>
                                                {formatDate(q.created_at)}
                                            </td>
                                            <td className="px-6 py-5 text-muted-foreground text-xs truncate max-w-[180px]" title={q.retrieved_doc_title || ""}>
                                                {q.retrieved_doc_title || "—"}
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Show More */}
            {queries.length < total && (
                <div className="px-6 py-8 flex justify-center">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setLimit((prev) => prev + 10);
                        }}
                        className="px-6 py-2.5 rounded-lg border border-primary/30 bg-primary/5 text-primary text-xs font-bold uppercase tracking-widest hover:bg-primary/10 hover:border-primary/50 transition-all"
                    >
                        Show More ({queries.length} of {total})
                    </button>
                </div>
            )}
        </div>
    );
}
