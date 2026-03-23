"use client";

import { useEffect, useState } from "react";
import { BarChart3, AlertCircle } from "lucide-react";
import { getDocumentUsage, getDocumentConfidence } from "@/lib/api";
import type { DocumentUsageItem, DocumentConfidenceItem } from "@/lib/api";
import { useAuth } from "@clerk/nextjs";

export default function DocumentStats() {
    const { getToken } = useAuth();
    const [mostUsed, setMostUsed] = useState<DocumentUsageItem[]>([]);
    const [lowConfidence, setLowConfidence] = useState<DocumentConfidenceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            try {
                const token = await getToken();
                const [usage, confidence] = await Promise.all([
                    getDocumentUsage(token || undefined),
                    getDocumentConfidence(token || undefined),
                ]);
                setMostUsed(usage.most_used);
                setLowConfidence(confidence.low_confidence);
            } catch (err) {
                console.error("Failed to load document stats", err);
                setError("Failed to load document statistics. Please try again later.");
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [getToken]);

    const maxUsage = Math.max(...mostUsed.map((d) => d.count), 1);

    if (loading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {[0, 1].map((i) => (
                    <div key={i} className="glass border border-white/[0.05] rounded-[2rem] p-6 animate-pulse">
                        <div className="h-4 w-40 bg-white/10 rounded mb-6" />
                        <div className="space-y-4">
                            {[0, 1, 2, 3, 4].map((j) => (
                                <div key={j} className="h-3 bg-white/5 rounded" />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (error) {
        return <div className="text-red-500">{error}</div>;
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Most Used Documents */}
            <div className="glass border border-white/[0.05] rounded-[2rem] p-6 shadow-2xl">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-6 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-400" />
                    Most Used Documents
                </h3>
                {mostUsed.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                        No document usage data yet.
                    </p>
                ) : (
                    <div className="space-y-4">
                        {mostUsed.slice(0, 5).map((doc) => (
                            <div key={doc.name} className="flex items-center justify-between group">
                                <p className="text-xs font-bold text-white truncate group-hover:text-primary transition-colors" title={doc.name}>
                                    {doc.name}
                                </p>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground tabular-nums whitespace-nowrap ml-4">
                                    {doc.count} queries
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Low Confidence Documents */}
            <div className="glass border border-white/[0.05] rounded-[2rem] p-6 shadow-2xl">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-6 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    Low Confidence Documents
                </h3>
                {lowConfidence.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                        All documents have healthy confidence scores.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {lowConfidence.slice(0, 5).map((doc) => {
                            const pct = Math.round(doc.avg_confidence * 100);
                            const isVeryLow = pct < 30;
                            return (
                                <div
                                    key={doc.name}
                                    className={`flex items-center justify-between bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-3 ${
                                        isVeryLow ? "border-red-500/50" : ""
                                    }`}
                                >
                                    <div className="min-w-0 flex-1 mr-4">
                                        <p className="text-xs font-bold text-white truncate" title={doc.name}>
                                            {doc.name}
                                        </p>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-1">
                                            {doc.query_count} queries
                                        </p>
                                    </div>
                                    <span className="text-[10px] font-bold tabular-nums text-muted-foreground">
                                        {pct}% confidence
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
