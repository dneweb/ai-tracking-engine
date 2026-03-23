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
    colorClass,
}: {
    icon: LucideIcon;
    value: string | number;
    label: string;
    sublabel?: string;
    colorClass?: string;
}) {
    return (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 flex items-center gap-4 min-w-0">
            <div className={`p-3 rounded-lg shrink-0 ${colorClass ? colorClass.replace("text-", "bg-").replace("400", "500/10") : "bg-white/5"}`}>
                <Icon className={`w-5 h-5 ${colorClass || "text-white"}`} />
            </div>
            <div className="min-w-0">
                <div className={`text-2xl font-bold ${colorClass || "text-white"}`}>
                    {value}
                </div>
                <div className="text-sm text-gray-400 truncate">{label}</div>
                {sublabel && (
                    <div className="text-xs text-gray-500 mt-0.5 truncate">{sublabel}</div>
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
                colorClass="text-orange-400"
            />
            <StatCard
                icon={Layers}
                value={summary.clusters_identified}
                label="Topics Found"
                colorClass="text-blue-400"
            />
            <StatCard
                icon={Flame}
                value={summary.high_priority_count}
                label="High Priority"
                colorClass="text-red-400"
            />
            <StatCard
                icon={AlertCircle}
                value={summary.medium_priority_count}
                label="Medium Priority"
                colorClass="text-yellow-400"
            />
            <StatCard
                icon={ShieldCheck}
                value={summary.low_priority_count}
                label="Low Priority"
                colorClass="text-gray-400"
            />
        </div>
    );
}
