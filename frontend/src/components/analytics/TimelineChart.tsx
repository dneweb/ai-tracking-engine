"use client";

import { useEffect, useState, useCallback } from "react";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Zap, Activity } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { getTimelineData } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface TimelineEntry {
    date: string;
    label: string;
    count: number;
}

interface TimelineResponse {
    timeline: Array<{ date: string; count: number }>;
    total_period: number;
    trend_vs_previous: number;
}

type Period = "7" | "30";

function formatDate(isoDate: string): string {
    const parts = isoDate.split("-");
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    return `${months[month - 1]} ${day}`;
}

function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload || !payload.length) return null;
    const count = payload[0].value ?? 0;
    return (
        <div className="glass border border-strong rounded-xl px-4 py-3 shadow-2xl backdrop-blur-xl">
            <p className="text-[clamp(0.5rem,1.0vw,0.625rem)] font-label font-bold text-tertiary uppercase tracking-widest mb-1">{label} · SESSION</p>
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent-primary" />
                <p className="text-sm font-bold text-primary">
                    <span className="text-xl mr-1 font-label">{count}</span> Queries Synthesized
                </p>
            </div>
        </div>
    );
}

const GRADIENT_ID = "neuralTimelineGradient";

export default function TimelineChart() {
    const { getToken } = useAuth();
    const { member } = useCurrentMember();
    const [timelineData, setTimelineData] = useState<TimelineEntry[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState<Period>("30");
    const [totalPeriod, setTotalPeriod] = useState(0);
    const [trend, setTrend] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchTimeline = useCallback(async (days: Period) => {
        setLoading(true);
        try {
            const token = await getToken();
            const orgId = member?.org_id ?? "";
            const data: TimelineResponse = await getTimelineData(days, token || undefined, orgId);
            const formatted: TimelineEntry[] = data.timeline.map((entry) => ({
                date: entry.date,
                label: formatDate(entry.date),
                count: entry.count,
            }));
            setTimelineData(formatted);
            setTotalPeriod(data.total_period);
            setTrend(data.trend_vs_previous);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [getToken, member]);

    useEffect(() => {
        if (member) {
            fetchTimeline(selectedPeriod);
        }
    }, [selectedPeriod, fetchTimeline, member]);

    return (
        <div className="h-full flex flex-col pt-4">
            {/* Chart Sub-Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                        <span className="text-[clamp(0.5rem,1.0vw,0.625rem)] font-label font-bold text-tertiary tracking-widest uppercase">Periodic Throughput</span>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-2xl font-label font-bold text-primary">{totalPeriod.toLocaleString()}</span>
                            <div className={cn(
                                "flex items-center gap-1 text-[clamp(0.45rem,0.9vw,0.5625rem)] font-bold px-2 py-0.5 rounded-md border",
                                trend >= 0 ? "text-accent-secondary bg-accent-secondary/10 border-accent-secondary/20" : "text-accent-danger bg-accent-danger/10 border-accent-danger/20"
                            )}>
                                {trend >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                                {Math.abs(trend)}%
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1 bg-surface border border-subtle rounded-xl p-1 shadow-inner h-9">
                    {(["7", "30"] as Period[]).map((p) => (
                        <button
                            key={p}
                            onClick={() => setSelectedPeriod(p)}
                            className={cn(
                                "h-full px-4 text-[clamp(0.45rem,0.9vw,0.5625rem)] font-label font-bold uppercase tracking-widest rounded-lg transition-all",
                                selectedPeriod === p ? "bg-accent-primary text-white shadow-lg" : "text-tertiary hover:text-primary"
                            )}
                        >
                            {p} Days Scan
                        </button>
                    ))}
                </div>
            </div>

            {/* Chart Area */}
            <div className="flex-1 min-h-0 relative">
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 flex items-center justify-center bg-base/50 z-10 backdrop-blur-[0.125rem]"
                        >
                            <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
                        </motion.div>
                    ) : (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="w-full h-full"
                        >
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="4 4" stroke="var(--border-subtle)" vertical={false} />
                                    <XAxis 
                                        dataKey="label" 
                                        tick={{ fill: "var(--text-tertiary)", fontSize: 10, fontFamily: "var(--font-label)", fontWeight: 600 }}
                                        axisLine={false}
                                        tickLine={false}
                                        interval={selectedPeriod === "30" ? 5 : 0}
                                    />
                                    <YAxis 
                                        tick={{ fill: "var(--text-tertiary)", fontSize: 10, fontFamily: "var(--font-label)" }}
                                        axisLine={false}
                                        tickLine={false}
                                        allowDecimals={false}
                                        width={40}
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--accent-primary)", strokeWidth: 1, strokeDasharray: "4 4" }} />
                                    <Area 
                                        type="monotone" 
                                        dataKey="count" 
                                        stroke="var(--accent-primary)" 
                                        strokeWidth={3}
                                        fill={`url(#${GRADIENT_ID})`}
                                        animationDuration={1500}
                                        dot={{ r: 4, fill: "var(--bg-base)", stroke: "var(--accent-primary)", strokeWidth: 2 }}
                                        activeDot={{ r: 6, fill: "var(--accent-primary)", stroke: "var(--bg-base)", strokeWidth: 2 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

function Loader2({ className }: { className?: string }) {
    return (
        <svg className={cn("animate-spin", className)} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
    );
}
