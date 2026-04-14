import { type TopicCluster } from "@/lib/api";
import { Bot, Lightbulb, FileEdit, CheckCircle2 } from "lucide-react";

interface InsightsAndSOPCardProps {
    cluster: TopicCluster;
}

export default function InsightsAndSOPCard({ cluster }: InsightsAndSOPCardProps) {
    if (!cluster.llm_analysis) return null;

    const analysis = cluster.llm_analysis;
    const insights = analysis.knowledge_gap_insights;
    const rec = analysis.sop_recommendation;

    return (
        <div className="mt-6 border-t border-[var(--border-subtle)] pt-6 space-y-6">
            <div className="flex items-center gap-2 text-[var(--brand)] mb-4">
                <Bot className="w-5 h-5" />
                <h4 className="font-bold text-lg">AI Deep Discovery</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Insights Panel */}
                <div className="space-y-4">
                    <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border-subtle)]">
                        <div className="flex items-center gap-2 text-[var(--brand)] mb-2">
                            <Lightbulb className="w-4 h-4" />
                            <h5 className="font-bold">What Employees Want to Know</h5>
                        </div>
                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{insights.what_employees_want_to_know}</p>
                    </div>

                    <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border-subtle)]">
                        <div className="flex items-center gap-2 text-[var(--warning)] mb-2">
                            <FileEdit className="w-4 h-4" />
                            <h5 className="font-bold">Why Current Documentation Fails</h5>
                        </div>
                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{insights.why_current_sop_fails}</p>
                    </div>

                    <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border-subtle)]">
                        <div className="flex items-baseline justify-between mb-2">
                            <h5 className="font-bold text-[var(--success)]">Action Plan Example</h5>
                            <span className="text-xs bg-[var(--success)]/10 text-[var(--success)] px-2 py-0.5 rounded-full border border-[var(--success)]/20">
                                {rec.confidence}% Confidence
                            </span>
                        </div>
                        <div className="text-sm text-[var(--text-secondary)]">
                            <strong className="text-[var(--text-primary)]">Identify:</strong> {rec.problem}
                        </div>
                        <div className="text-sm text-[var(--text-secondary)] mt-2">
                            <strong className="text-[var(--text-primary)]">Action:</strong> {rec.action}
                        </div>
                    </div>
                </div>

                {/* Auto-Drafted SOP Panel */}
                <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--brand)]/30 overflow-hidden flex flex-col h-full">
                    <div className="bg-[var(--brand)]/10 px-4 py-3 border-b border-[var(--brand)]/20 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-[var(--brand)]">
                            <CheckCircle2 className="w-4 h-4" />
                            <h5 className="font-bold text-sm">AI-Drafted Knowledge Base Update</h5>
                        </div>
                        <span className="text-xs text-[var(--brand)]/70 italic opacity-70">Review before implementing.</span>
                    </div>
                    <div className="p-4 flex-1">
                        <div className="bg-[var(--bg-secondary)] rounded-lg p-4 h-full border border-[var(--border-subtle)] text-sm text-[var(--text-secondary)] font-medium whitespace-pre-wrap overflow-y-auto max-h-[300px] fancy-scrollbar">
                            {analysis.auto_sop_rewrite}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
