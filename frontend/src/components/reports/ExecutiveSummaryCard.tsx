import { type ReportSummary, type SOPReport } from "@/lib/api";
import { Activity, AlertTriangle, FileWarning, Layers } from "lucide-react";

interface ExecutiveSummaryCardProps {
    summary: ReportSummary;
    productivity: SOPReport["productivity_impact"];
}

export default function ExecutiveSummaryCard({ summary, productivity }: ExecutiveSummaryCardProps) {
    const healthScore = summary.health_score ?? 0;

    // Determine color based on health score
    let scoreColor = "text-red-500";
    let scoreBg = "bg-red-500/10";
    let scoreBorder = "border-red-500/20";
    let statusLabel = "Critical";

    if (healthScore === 100 && summary.total_low_confidence === 0) {
        scoreColor = "text-green-400";
        scoreBg = "bg-green-500/10";
        scoreBorder = "border-green-500/30";
        statusLabel = "Perfect";
    } else if (healthScore >= 80) {
        scoreColor = "text-green-500";
        scoreBg = "bg-green-500/10";
        scoreBorder = "border-green-500/20";
        statusLabel = "Healthy";
    } else if (healthScore >= 60) {
        scoreColor = "text-yellow-500";
        scoreBg = "bg-yellow-500/10";
        scoreBorder = "border-yellow-500/20";
        statusLabel = "Needs Improvement";
    }

    if (!productivity) return null;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Health Score Main Box */}
            <div className={`col-span-1 border rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-lg transition-all ${scoreBg} ${scoreBorder}`}>
                <Activity className={`w-14 h-14 mb-4 ${scoreColor} animate-pulse`} />
                <h3 className="text-gray-400 font-medium text-xs tracking-[0.2em] uppercase mb-2">Knowledge Health Score</h3>
                <div className="flex items-baseline gap-2">
                    <span className={`text-7xl font-black tracking-tight ${scoreColor}`}>{healthScore}</span>
                    <span className="text-xl text-gray-500 font-medium opacity-50">/ 100</span>
                </div>
                <p className={`mt-6 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase border ${scoreColor} ${scoreBorder}`}>
                    {statusLabel}
                </p>
            </div>

            {/* Quick Stats Grid */}
            <div className="col-span-1 lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-card border border-border rounded-xl p-6 flex flex-col justify-center hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-3 text-gray-400 mb-2">
                        <FileWarning className="w-5 h-5 text-orange-400" />
                        <span className="font-medium text-sm">Unanswered Queries</span>
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">
                        {summary.total_low_confidence || <span className="text-gray-600">0</span>}
                    </div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Out of {summary.total_queries_in_period} total queries</div>
                </div>

                <div className="bg-card border border-border rounded-xl p-6 flex flex-col justify-center hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-3 text-gray-400 mb-2">
                        <Layers className="w-5 h-5 text-blue-400" />
                        <span className="font-medium text-sm">Knowledge Gaps (Topics)</span>
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">
                        {summary.clusters_identified || <span className="text-gray-600">None</span>}
                    </div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Unique missing topics discovered</div>
                </div>

                <div className="bg-card border border-border rounded-xl p-6 flex flex-col justify-center hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-3 text-gray-400 mb-2">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        <span className="font-medium text-sm">High Risk Topics</span>
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">
                        {summary.high_priority_count || <span className="text-gray-600">0</span>}
                    </div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Requiring immediate attention</div>
                </div>

                {/* Productivity Impact */}
                <div className="bg-purple-950/20 border border-purple-500/20 rounded-xl p-6 flex flex-col justify-center hover:border-purple-500/40 transition-colors">
                    <div className="flex items-center gap-3 text-purple-400 mb-2">
                        <Activity className="w-5 h-5" />
                        <span className="font-medium text-sm">Productivity Impact</span>
                    </div>
                    <div className="text-3xl font-bold text-purple-300 mb-1">
                        {productivity.estimated_lost_hours > 0 ? `${productivity.estimated_lost_hours} hrs` : <span className="text-green-400 text-xl uppercase tracking-widest">Ready for Scale</span>}
                    </div>
                    <div className="text-xs text-purple-400/80 uppercase tracking-wide">Estimated time lost searching</div>
                </div>
            </div>
        </div>
    );
}
