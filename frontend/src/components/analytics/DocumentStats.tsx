"use client";

import { useEffect, useState } from "react";
import { BarChart3, AlertCircle, ShieldAlert, Zap, ArrowRight, Activity, FileText } from "lucide-react";
import { getDocumentUsage, getDocumentConfidence } from "@/lib/api";
import type { DocumentUsageItem, DocumentConfidenceItem } from "@/lib/api";
import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export default function DocumentStats() {
    const { getToken } = useAuth();
    const [mostUsed, setMostUsed] = useState<DocumentUsageItem[]>([]);
    const [lowConfidence, setLowConfidence] = useState<DocumentConfidenceItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const token = await getToken();
                const [usage, confidence] = await Promise.all([
                    getDocumentUsage(token || undefined),
                    getDocumentConfidence(token || undefined),
                ]);
                setMostUsed(usage.most_used || []);
                setLowConfidence(confidence.low_confidence || []);
            } catch (err) {
                console.error("Failed to load document stats", err);
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
                    <Card key={i} variant="surface" className="h-[300px] animate-pulse">
                        <div className="h-4 w-40 bg-elevated rounded mb-6" />
                        <div className="space-y-4">
                            {[0, 1, 2, 3].map((j) => (
                                <div key={j} className="h-10 bg-elevated rounded-xl" />
                            ))}
                        </div>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Most Used Assets */}
            <Card variant="default" padding="lg" className="border-subtle bg-surface/30">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-subtle">
                   <div className="flex items-center gap-3">
                        <div className="p-2 bg-accent-primary/10 rounded-xl border border-accent-primary/20">
                            <Activity className="w-4 h-4 text-accent-primary" />
                        </div>
                        <h3 className="text-[11px] font-label font-bold text-primary uppercase tracking-[0.2em]">
                            High Intensity Assets
                        </h3>
                   </div>
                   <Badge variant="subtle" className="text-[9px] uppercase tracking-widest px-2">Top 5 Clusters</Badge>
                </div>
                
                <div className="space-y-6">
                    {mostUsed.length > 0 ? (
                        mostUsed.slice(0, 5).map((doc, idx) => (
                            <motion.div 
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                key={doc.name} 
                                className="space-y-2 group"
                            >
                                <div className="flex items-center justify-between text-[11px] font-label font-bold uppercase tracking-wider">
                                    <div className="flex items-center gap-2 max-w-[240px]">
                                        <FileText className="w-3.5 h-3.5 text-tertiary group-hover:text-accent-primary transition-colors" />
                                        <span className="text-secondary group-hover:text-primary truncate" title={doc.name}>{doc.name}</span>
                                    </div>
                                    <span className="text-accent-primary tabular-nums">{doc.count} Queries</span>
                                </div>
                                <div className="h-1.5 bg-elevated rounded-full overflow-hidden border border-subtle">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(doc.count / maxUsage) * 100}%` }}
                                        transition={{ duration: 1.2, ease: "easeOut" }}
                                        className="h-full bg-accent-primary shadow-[0_0_8px_var(--glow-primary)] rounded-full"
                                    />
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <div className="py-20 text-center text-tertiary font-label text-[10px] uppercase tracking-widest">
                            No Asset Intensity Data
                        </div>
                    )}
                </div>
            </Card>

            {/* Loyalty Risks */}
            <Card variant="default" padding="lg" className="border-subtle bg-surface/30">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-subtle">
                   <div className="flex items-center gap-3">
                        <div className="p-2 bg-accent-danger/10 rounded-xl border border-accent-danger/20">
                            <ShieldAlert className="w-4 h-4 text-accent-danger" />
                        </div>
                        <h3 className="text-[11px] font-label font-bold text-primary uppercase tracking-[0.2em]">
                            System Integrity Risks
                        </h3>
                   </div>
                   <Badge variant="subtle" className="bg-accent-danger/10 text-accent-danger border-accent-danger/20 text-[9px] uppercase tracking-widest px-2">Critical Delta</Badge>
                </div>

                <div className="space-y-3">
                    {lowConfidence.length > 0 ? (
                        lowConfidence.slice(0, 5).map((doc, idx) => {
                            const pct = Math.round(doc.avg_confidence < 1 ? doc.avg_confidence * 100 : doc.avg_confidence);
                            return (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.1 }}
                                    key={doc.name}
                                    className="flex items-center justify-between bg-elevated border border-subtle rounded-xl px-5 py-4 hover:border-accent-danger/30 transition-all group"
                                >
                                    <div className="min-w-0 flex-1 mr-6">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-accent-danger shadow-[0_0_6px_var(--glow-danger)]" />
                                            <p className="text-[13px] font-bold text-primary truncate group-hover:text-accent-danger transition-colors" title={doc.name}>
                                                {doc.name}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-4 mt-1.5">
                                            <span className="text-[9px] font-label font-bold text-tertiary uppercase tracking-wider">{doc.query_count} Interactions</span>
                                            <span className="text-tertiary/20 text-xs">|</span>
                                            <span className="text-[9px] font-label font-bold text-accent-danger uppercase tracking-wider">Scoring Refinement Suggested</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-lg font-label font-bold text-primary tabular-nums">{pct}%</span>
                                        <span className="text-[8px] font-label font-bold text-tertiary uppercase tracking-widest">Accuracy</span>
                                    </div>
                                </motion.div>
                            );
                        })
                    ) : (
                        <div className="py-20 text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 bg-accent-secondary/10 rounded-xl border border-accent-secondary/20 mb-4">
                                <Zap className="w-6 h-6 text-accent-secondary" />
                            </div>
                            <p className="text-tertiary font-label text-[10px] uppercase tracking-widest">Neural Stability Maximized</p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
