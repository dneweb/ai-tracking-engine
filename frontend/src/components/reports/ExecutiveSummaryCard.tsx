"use client";

import { type ReportSummary, type SOPReport } from "@/lib/api";
import { Activity, AlertTriangle, FileWarning, Layers, Zap, ShieldAlert, Timer, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import CountUp from "react-countup";
import { motion, Variants } from "framer-motion";
import { cn } from "@/lib/utils";

interface ExecutiveSummaryCardProps {
    summary: ReportSummary;
    productivity: SOPReport["productivity_impact"];
}

const fadeUp: Variants = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.19, 1, 0.22, 1] } },
};

export default function ExecutiveSummaryCard({ summary, productivity }: ExecutiveSummaryCardProps) {
    const healthScore = summary.health_score ?? 0;

    const getHealthConfig = (score: number) => {
        if (score >= 90) return { color: "var(--success)", label: "Neural Equilibrium", icon: Activity };
        if (score >= 70) return { color: "var(--brand)", label: "Sync Stable", icon: Activity };
        if (score >= 50) return { color: "var(--warning)", label: "Integrity Degradation", icon: ShieldAlert };
        return { color: "var(--danger)", label: "Critical Failure", icon: AlertTriangle };
    };

    const config = getHealthConfig(healthScore);

    if (!productivity) return null;

    return (
        <div className="flex flex-col gap-8">
            {/* Top Tier: Primary Health & Impact */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Health Score Main Box */}
                <motion.div
                    variants={fadeUp} initial="initial" animate="animate"
                    className="xl:col-span-1 p-10 rounded-[3.0rem] bg-[var(--card-bg)] border border-[var(--border-strong)] shadow-[var(--card-shadow-lg)] hover:border-[var(--brand)] transition-all duration-700 relative overflow-hidden flex flex-col items-center justify-center text-center group min-h-[clamp(20.0rem,40.0vw,25.0rem)]"
                >
                    <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-[0.05] transition-opacity blur-[6.25rem]"
                        style={{ backgroundColor: config.color }}
                    />

                    <div className="relative z-10 space-y-8 w-full">
                        <div
                            className="w-24 h-24 mx-auto rounded-[2.0rem] border-2 flex items-center justify-center transition-all duration-700 group-hover:scale-110 group-hover:rotate-[15deg] bg-[var(--bg-secondary)] shadow-xl"
                            style={{
                                borderColor: `color-mix(in srgb, ${config.color} 30%, transparent)`,
                                color: config.color,
                                boxShadow: `0 20px 40px -10px color-mix(in srgb, ${config.color} 20%, transparent)`
                            }}
                        >
                            <config.icon className="w-12 h-12" />
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-[clamp(0.55rem,1.1vw,0.6875rem)] font-bold text-[var(--text-muted)] tracking-[0.4em] uppercase">Neural Equilibrium</h3>
                            <div className="flex items-baseline justify-center gap-1">
                                <span className="text-8xl font-bold tracking-tighter text-[var(--text-primary)]" style={{ fontFamily: "var(--font-display)" }}>
                                    <CountUp end={healthScore} duration={2.5} />
                                </span>
                                <span className="text-2xl font-bold text-[var(--text-muted)]/20">%</span>
                            </div>
                        </div>

                        <div
                            className="px-8 py-3 rounded-2xl text-[clamp(0.5rem,1.0vw,0.625rem)] font-bold uppercase tracking-[0.2em] inline-flex items-center gap-3 border-2 shadow-sm"
                            style={{
                                backgroundColor: `color-mix(in srgb, ${config.color} 8%, transparent)`,
                                color: config.color,
                                borderColor: `color-mix(in srgb, ${config.color} 20%, transparent)`
                            }}
                        >
                            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: config.color }} />
                            {config.label}
                        </div>
                    </div>
                </motion.div>

                {/* Impact Metrics Grid */}
                <div className="xl:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <StatMetric
                        icon={FileWarning}
                        label="Anomalous Trace"
                        value={summary.total_low_confidence}
                        subValue={`Total of ${summary.total_queries_in_period} Sync Points`}
                        color="var(--warning)"
                        delay={0.1}
                    />
                    <StatMetric
                        icon={Layers}
                        label="Intelligence Clusters"
                        value={summary.clusters_identified}
                        subValue="Total Unique Identified Voids"
                        color="var(--brand)"
                        delay={0.2}
                    />
                    <StatMetric
                        icon={ShieldAlert}
                        label="Critical Delta"
                        value={summary.high_priority_count}
                        subValue="Immediate Sync Authorization Req"
                        color="var(--danger)"
                        delay={0.3}
                    />
                    <StatMetric
                        icon={Timer}
                        label="Temporal Latency"
                        value={Math.round(productivity.estimated_lost_hours)}
                        unit="HRS"
                        subValue="Projected Scale Efficiency Loss"
                        color="var(--success)"
                        delay={0.4}
                    />
                </div>
            </div>
        </div>
    );
}

function StatMetric({ icon: Icon, label, value, subValue, color, unit, delay }: any) {
    return (
        <motion.div
            variants={fadeUp} initial="initial" animate="animate" transition={{ delay }}
            className="p-8 rounded-[2.25rem] bg-[var(--card-bg)] border border-[var(--border-subtle)] shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-lg)] hover:border-[var(--brand)] transition-all duration-500 group flex flex-col justify-between"
        >
            <div className="flex items-center justify-between mb-8">
                <div className="space-y-1">
                    <p className="text-[clamp(0.5rem,1.0vw,0.625rem)] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">{label}</p>
                    <div className="h-[0.125rem] w-8 bg-[var(--brand)] opacity-20 group-hover:w-full group-hover:opacity-100 transition-all duration-700" style={{ backgroundColor: color }} />
                </div>
                <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-muted)] group-hover:bg-[var(--brand-soft)] transition-colors"
                    style={{ color: color }}
                >
                    <Icon className="w-5 h-5" />
                </div>
            </div>

            <div>
                <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-[var(--text-primary)] tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                        {value === 0 ? "00" : <CountUp end={value} duration={2} />}
                    </span>
                    {unit && <span className="text-lg font-bold text-[var(--text-muted)]">{unit}</span>}
                </div>
                <p className="text-[clamp(0.5rem,1.0vw,0.625rem)] font-bold text-[var(--text-muted)]/50 uppercase tracking-widest mt-2 flex items-center gap-1.5">
                    {subValue}
                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </p>
            </div>
        </motion.div>
    );
}
