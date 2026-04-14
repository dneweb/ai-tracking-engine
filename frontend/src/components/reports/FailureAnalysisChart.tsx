import { type TopicCluster } from "@/lib/api";
import { AlertOctagon } from "lucide-react";

interface FailureAnalysisChartProps {
    cluster: TopicCluster;
}

export default function FailureAnalysisChart({ cluster }: FailureAnalysisChartProps) {
    if (!cluster.llm_analysis) return null;

    const failures = cluster.llm_analysis.failure_analysis;
    const total = Object.values(failures).reduce((a, b) => a + b, 0);

    const data = [
        { label: "Missing SOP", value: failures.missing_sop, color: "var(--danger)", text: "text-[var(--danger)]" },
        { label: "Ambiguous Docs", value: failures.ambiguous_documentation, color: "var(--warning)", text: "text-[var(--warning)]" },
        { label: "Wrong Document", value: failures.wrong_document_retrieved, color: "var(--brand)", text: "text-[var(--brand)]" },
        { label: "Outdated Info", value: failures.outdated_information, color: "var(--success)", text: "text-[var(--success)]" },
        { label: "Bad Intent Parsing", value: failures.query_intent_misinterpretation, color: "var(--brand-soft)", text: "text-[var(--brand-soft)]" },
    ].filter(d => d.value > 0).sort((a, b) => b.value - a.value);

    // If no specific failures, just don't render this part
    if (total === 0 || data.length === 0) return null;

    return (
        <div className="mt-6 border-t border-[var(--border-subtle)] pt-6">
            <div className="flex items-center gap-2 text-[var(--warning)] mb-4">
                <AlertOctagon className="w-5 h-5" />
                <h4 className="font-bold text-lg">Root Cause Engine</h4>
            </div>

            <div className="space-y-4">
                {data.map((item, idx) => {
                    const pct = Math.round((item.value / total) * 100);
                    return (
                        <div key={idx} className="flex items-center gap-4">
                            <div className={`w-36 text-sm font-medium ${item.text}`}>{item.label}</div>
                            <div className="flex-1 bg-[var(--bg-primary)] h-3 rounded-full overflow-hidden border border-[var(--border-subtle)]">
                                <div
                                    className="h-full rounded-full"
                                    style={{ width: `${pct}%`, backgroundColor: item.color }}
                                />
                            </div>
                            <div className="w-12 text-right text-sm text-[var(--text-muted)]">{pct}%</div>
                            <div className="w-8 text-right text-xs text-[var(--text-muted)] opacity-50">({item.value})</div>
                        </div>
                    );
                })}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-4 italic text-right opacity-50">Analyzed via Local Llama 3 parameters.</p>
        </div>
    );
}
