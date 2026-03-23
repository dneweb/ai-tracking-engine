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
        { label: "Missing SOP", value: failures.missing_sop, color: "bg-red-500", text: "text-red-400" },
        { label: "Ambiguous Docs", value: failures.ambiguous_documentation, color: "bg-orange-500", text: "text-orange-400" },
        { label: "Wrong Document", value: failures.wrong_document_retrieved, color: "bg-yellow-500", text: "text-yellow-400" },
        { label: "Outdated Info", value: failures.outdated_information, color: "bg-blue-500", text: "text-blue-400" },
        { label: "Bad Intent Parsing", value: failures.query_intent_misinterpretation, color: "bg-purple-500", text: "text-purple-400" },
    ].filter(d => d.value > 0).sort((a, b) => b.value - a.value);

    // If no specific failures, just don't render this part
    if (total === 0 || data.length === 0) return null;

    return (
        <div className="mt-6 border-t border-[#3a3a3a] pt-6">
            <div className="flex items-center gap-2 text-orange-400 mb-4">
                <AlertOctagon className="w-5 h-5" />
                <h4 className="font-semibold text-lg">Root Cause Engine</h4>
            </div>

            <div className="space-y-4">
                {data.map((item, idx) => {
                    const pct = Math.round((item.value / total) * 100);
                    return (
                        <div key={idx} className="flex items-center gap-4">
                            <div className={`w-36 text-sm font-medium ${item.text}`}>{item.label}</div>
                            <div className="flex-1 bg-[#1a1a1a] h-3 rounded-full overflow-hidden border border-[#2a2a2a]">
                                <div
                                    className={`h-full ${item.color} rounded-full`}
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                            <div className="w-12 text-right text-sm text-gray-400">{pct}%</div>
                            <div className="w-8 text-right text-xs text-gray-500">({item.value})</div>
                        </div>
                    );
                })}
            </div>
            <p className="text-xs text-gray-500 mt-4 italic text-right">Analyzed via Local Llama 3 parameters.</p>
        </div>
    );
}
