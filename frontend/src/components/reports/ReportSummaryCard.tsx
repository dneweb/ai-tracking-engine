"use client";

import type { ReportSummary } from "@/lib/api";
import {
    MessageSquareWarning,
    Layers,
    Flame,
    AlertCircle,
    ShieldCheck,
    type LucideIcon,
} from "lucide-react";

interface ReportSummaryCardProps {
    summary: ReportSummary;
}

function StatCard({
    icon: Icon,
    value,
    label,
    sublabel,
    color,
}: {
    icon: LucideIcon;
    value: string | number;
    label: string;
    sublabel?: string;
    color: string;
}) {
    return (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl p-5 flex items-center gap-4 min-w-0">
            <div 
                className="p-3 rounded-lg shrink-0 flex items-center justify-center" 
                style={{ backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)` }}
            >
                <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <div className="min-w-0">
                <div className="text-2xl font-bold text-[var(--text-primary)]" style={{ color }}>
                    {value}
                </div>
                <div className="text-sm text-[var(--text-muted)] truncate">{label}</div>
                {sublabel && (
                    <div className="text-xs text-[var(--text-muted)]/50 mt-0.5 truncate">{sublabel}</div>
                )}
            </div>
        </div>
    );
}

export default function ReportSummaryCard({ summary }: ReportSummaryCardProps) {
    const lowConfPct = summary.total_queries_in_period > 0
        ? Math.round((summary.total_low_confidence / summary.total_queries_in_period) * 100)
        : 0;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <StatCard
                icon={MessageSquareWarning}
                value={summary.total_low_confidence}
                label="Low Confidence"
                sublabel={`${lowConfPct}% of ${summary.total_queries_in_period} total`}
                color="var(--warning)"
            />
            <StatCard
                icon={Layers}
                value={summary.clusters_identified}
                label="Topics Found"
                color="var(--brand)"
            />
            <StatCard
                icon={Flame}
                value={summary.high_priority_count}
                label="High Priority"
                color="var(--danger)"
            />
            <StatCard
                icon={AlertCircle}
                value={summary.medium_priority_count}
                label="Medium Priority"
                color="var(--warning)"
            />
            <StatCard
                icon={ShieldCheck}
                value={summary.low_priority_count}
                label="Low Priority"
                color="var(--success)"
            />
        </div>
    );
}
