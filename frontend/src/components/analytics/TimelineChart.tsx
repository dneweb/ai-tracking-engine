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
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { getTimelineData } from "@/lib/api";

// ── Types ────────────────────────────────────────────────────────────────────

interface TimelineEntry {
    date: string;   // "YYYY-MM-DD"
    label: string;  // "Feb 18" (formatted for display)
    count: number;
}

interface TimelineResponse {
    timeline: Array<{ date: string; count: number }>;
    total_period: number;
    trend_vs_previous: number;
}

type Period = "7" | "30";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Convert "2026-02-18" → "Feb 18" */
function formatDate(isoDate: string): string {
    const parts = isoDate.split("-");
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[month - 1]} ${day}`;
}

// ── Custom Tooltip ───────────────────────────────────────────────────────────

interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{ value: number }>;
    label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
    if (!active || !payload || !payload.length) return null;
    const count = payload[0].value ?? 0;
    return (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 shadow-lg">
            <p className="text-xs text-gray-400 mb-0.5">{label}</p>
            <p className="text-sm font-semibold text-white">
                {count} {count === 1 ? "question" : "questions"}
            </p>
        </div>
    );
}

// ── Skeleton Loader ───────────────────────────────────────────────────────────

function ChartSkeleton() {
    return (
        <div className="animate-pulse space-y-4 pt-4">
            <div className="h-4 w-1/3 bg-white/10 rounded" />
            <div className="h-[300px] bg-white/5 rounded-xl" />
        </div>
    );
}

// ── SVG Gradient Definition ───────────────────────────────────────────────────

const GRADIENT_ID = "timelineGradient";

function GradientDef() {
    return (
        <defs>
            <linearGradient id={GRADIENT_ID} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3B82F6" />   {/* blue-500 */}
                <stop offset="100%" stopColor="#A855F7" /> {/* purple-500 */}
            </linearGradient>
        </defs>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function TimelineChart() {
    const { getToken } = useAuth();
    const [timelineData, setTimelineData] = useState<TimelineEntry[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState<Period>("30");
    const [totalPeriod, setTotalPeriod] = useState(0);
    const [trend, setTrend] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTimeline = useCallback(async (days: Period) => {
        setLoading(true);
        setError(null);
        try {
            const token = await getToken();
            const data: TimelineResponse = await getTimelineData(days, token || undefined);

            // Add formatted label for X-axis display
            const formatted: TimelineEntry[] = data.timeline.map((entry) => ({
                date: entry.date,
                label: formatDate(entry.date),
                count: entry.count,
            }));

            setTimelineData(formatted);
            setTotalPeriod(data.total_period);
            setTrend(data.trend_vs_previous);
            console.log("[TimelineChart] Data shape:", {
                count: formatted.length,
                sample: formatted[0],
                total: data.total_period
            });
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : "Failed to load timeline data.";
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [getToken]);

    useEffect(() => {
        fetchTimeline(selectedPeriod);
    }, [selectedPeriod, fetchTimeline]);

    // ── Trend Badge ──────────────────────────────────────────────────────────────

    function TrendBadge() {
        if (trend > 0) {
            return (
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-400">
                    <TrendingUp className="w-4 h-4" />
                    +{trend}% vs prior period
                </span>
            );
        } else if (trend < 0) {
            return (
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-red-400">
                    <TrendingDown className="w-4 h-4" />
                    {trend}% vs prior period
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-gray-500">
                <Minus className="w-4 h-4" />
                No change vs prior period
            </span>
        );
    }

    const isEmpty =
        timelineData.length === 0 || timelineData.every((d) => d.count === 0);

    // ── Render ───────────────────────────────────────────────────────────────────

    return (
        <div className="bg-card border border-white/[0.05] rounded-[2rem] p-6 shadow-2xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-white">
                        Questions Over Time
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {totalPeriod.toLocaleString()} total in the last {selectedPeriod} days
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Trend */}
                    {!loading && !error && <TrendBadge />}

                    {/* Period Toggle */}
                    <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.05] rounded-xl p-1 h-[36px]">
                        {(["7", "30"] as Period[]).map((p) => (
                            <button
                                key={p}
                                onClick={() => setSelectedPeriod(p)}
                                className={`px-4 h-full text-[10px] rounded-lg font-bold uppercase tracking-widest transition-all ${selectedPeriod === p
                                        ? "bg-primary text-white shadow-lg shadow-primary/20"
                                        : "text-muted-foreground hover:text-white bg-transparent"
                                    }`}
                            >
                                {p} Days
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Chart Area */}
            {loading ? (
                <ChartSkeleton />
            ) : error ? (
                <div className="flex items-center justify-center h-[300px] text-sm text-red-400">
                    ⚠️ {error}
                </div>
            ) : isEmpty ? (
                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground gap-2">
                    <span className="text-3xl">📭</span>
                    <span className="text-sm">No questions logged in this period.</span>
                </div>
            ) : (
                <div style={{ minHeight: "300px" }}>
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart
                            data={timelineData}
                            margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
                        >
                        <GradientDef />

                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#262626"
                            vertical={false}
                        />

                        {/* X-axis: show formatted label, reduce interval on 30-day view */}
                        <XAxis
                            dataKey="label"
                            tick={{ fill: "#6B7280", fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                            interval={selectedPeriod === "30" ? 4 : 0}
                        />

                        {/* Y-axis: integers only with buffer */}
                        <YAxis
                            tick={{ fill: "#9CA3AF", fontSize: 10, fontWeight: 600 }}
                            axisLine={false}
                            tickLine={false}
                            allowDecimals={false}
                            width={32}
                            domain={[0, (dataMax: number) => Math.max(dataMax + 2, 5)]}
                        />

                        <Tooltip
                            content={<CustomTooltip />}
                            cursor={{
                                stroke: "#3B82F6",
                                strokeWidth: 1,
                                strokeDasharray: "4 4",
                            }}
                        />

                        <Area
                            type="monotone"
                            dataKey="count"
                            stroke="#8B5CF6"
                            strokeWidth={3}
                            fill={`url(#${GRADIENT_ID})`}
                            fillOpacity={0.3}
                            dot={{ r: 4, fill: "#8B5CF6", strokeWidth: 0, fillOpacity: 1 }}
                            activeDot={{ r: 6, fill: "#A855F7", strokeWidth: 0 }}
                            isAnimationActive={true}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        )}
    </div>
);
}
