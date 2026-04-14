"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown, AlertTriangle, ArrowRight, Clock, ShieldAlert } from "lucide-react";
import { getLowConfidenceQueries } from "@/lib/api";
import type { LowConfidenceQuery } from "@/lib/api";
import { useAuth } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type SortField = "confidence" | "date";
type SortOrder = "asc" | "desc";

export default function LowConfidenceTable() {
    const { getToken } = useAuth();
    const [queries, setQueries] = useState<LowConfidenceQuery[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [limit, setLimit] = useState(10);
    const [sortBy, setSortBy] = useState<SortField>("confidence");
    const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const token = await getToken();
            const data = await getLowConfidenceQueries(limit, 0.6, 0, sortBy, sortOrder, token || undefined);
            setQueries(data.queries);
            setTotal(data.total);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [limit, sortBy, sortOrder, getToken]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const toggleSort = (field: SortField) => {
        if (sortBy === field) {
            setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
        } else {
            setSortBy(field);
            setSortOrder(field === "confidence" ? "asc" : "desc");
        }
    };

    function SortIcon({ field }: { field: SortField }) {
        if (sortBy !== field) return <ChevronsUpDown className="w-3 h-3 text-tertiary" />;
        return sortOrder === "asc" ? (
            <ChevronUp className="w-3 h-3 text-accent-primary" />
        ) : (
            <ChevronDown className="w-3 h-3 text-accent-primary" />
        );
    }

    return (
        <Card variant="default" padding="none" className="overflow-hidden border-subtle bg-surface/50">
            <div className="px-8 py-6 border-b border-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-accent-danger/10 flex items-center justify-center text-accent-danger border border-accent-danger/20 shadow-inner">
                        <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                            Neural Anomalies Identified
                        </h3>
                        <p className="text-[10px] font-label font-bold text-tertiary uppercase tracking-wider mt-0.5">
                            Confidence threshhold &lt; 60% &mdash; <span className="text-accent-danger">{total} Instances</span>
                        </p>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto scrollbar-hide">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-surface/50 text-tertiary border-b border-subtle">
                            <th className="px-8 py-5 text-[10px] font-label font-bold uppercase tracking-[0.2em] w-[45%]">Interaction Trace</th>
                            <th
                                className="px-8 py-5 text-[10px] font-label font-bold uppercase tracking-[0.2em] cursor-pointer select-none group/th"
                                onClick={() => toggleSort("confidence")}
                            >
                                <span className="inline-flex items-center gap-2 group-hover/th:text-primary transition-colors">
                                    Reliability <SortIcon field="confidence" />
                                </span>
                            </th>
                            <th
                                className="px-8 py-5 text-[10px] font-label font-bold uppercase tracking-[0.2em] cursor-pointer select-none group/th"
                                onClick={() => toggleSort("date")}
                            >
                                <span className="inline-flex items-center gap-2 group-hover/th:text-primary transition-colors">
                                    Frequency <SortIcon field="date" />
                                </span>
                            </th>
                            <th className="px-8 py-5 text-[10px] font-label font-bold uppercase tracking-[0.2em]">Primary Asset</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-subtle">
                        {loading && queries.length === 0 ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td className="px-8 py-6"><div className="h-3 w-64 bg-elevated rounded" /></td>
                                    <td className="px-8 py-6"><div className="h-4 w-12 bg-elevated rounded" /></td>
                                    <td className="px-8 py-6"><div className="h-3 w-20 bg-elevated rounded" /></td>
                                    <td className="px-8 py-6"><div className="h-4 w-32 bg-elevated rounded" /></td>
                                </tr>
                            ))
                        ) : (
                            queries.map((q, idx) => (
                                <React.Fragment key={q.id}>
                                    <motion.tr
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className={cn(
                                            "hover:bg-elevated transition-all cursor-pointer group",
                                            expandedRow === q.id && "bg-elevated/50"
                                        )}
                                        onClick={() => setExpandedRow(expandedRow === q.id ? null : q.id)}
                                    >
                                        <td className="px-8 py-5">
                                            <div className="flex items-start gap-4">
                                                <div className="p-1 bg-accent-danger/5 rounded mt-0.5 border border-accent-danger/10">
                                                    <AlertTriangle className="w-3 h-3 text-accent-danger" />
                                                </div>
                                                <span className="text-[13px] font-semibold text-primary truncate block max-w-lg group-hover:text-accent-primary transition-colors">
                                                    {q.question}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <Badge confidence={q.confidence_score}>{Math.round(q.confidence_score < 1 ? q.confidence_score * 100 : q.confidence_score)}% Match</Badge>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-label font-bold text-primary tabular-nums">
                                                    {new Date(q.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </span>
                                                <span className="text-[9px] font-label text-tertiary">{new Date(q.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-2 max-w-[180px]">
                                                <div className="w-1.5 h-1.5 rounded-full bg-accent-danger/30" />
                                                <span className="text-[11px] font-medium text-tertiary truncate">
                                                    {q.retrieved_doc_title || "Unindexed Asset"}
                                                </span>
                                            </div>
                                        </td>
                                    </motion.tr>
                                    <AnimatePresence>
                                        {expandedRow === q.id && (
                                            <tr>
                                                <td colSpan={4} className="px-8 py-0">
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: "auto", opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="py-8 space-y-6">
                                                            <Card variant="surface" padding="md" className="border-subtle bg-base/30">
                                                                <div className="flex items-center gap-2 text-[9px] font-label font-bold text-tertiary uppercase tracking-widest mb-3">
                                                                    <div className="w-2 h-2 rounded-full bg-accent-primary animate-pulse" />
                                                                    Trace Synthesis Answer
                                                                </div>
                                                                <p className="text-[13px] text-secondary leading-relaxed font-medium whitespace-pre-wrap">
                                                                    {q.answer}
                                                                </p>
                                                            </Card>
                                                            <div className="flex items-center gap-4 pl-4 border-l-2 border-accent-danger/20">
                                                                <Button variant="secondary" size="sm" className="h-8 text-[10px] tracking-widest uppercase rounded-lg">
                                                                    Adjust Weights
                                                                </Button>
                                                                <Button variant="ghost" size="sm" className="h-8 text-[10px] tracking-widest uppercase rounded-lg text-accent-danger">
                                                                    Purge Trace
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                </td>
                                            </tr>
                                        )}
                                    </AnimatePresence>
                                </React.Fragment>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination / Show More */}
            {queries.length < total && (
                <div className="px-8 py-6 border-t border-subtle bg-surface/30 flex justify-center">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            setLimit((prev) => prev + 10);
                        }}
                        className="rounded-full h-10 px-8 text-[10px] tracking-widest uppercase"
                    >
                        Synchronize More ({queries.length} / {total})
                    </Button>
                </div>
            )}
        </Card>
    );
}

import React from "react";
