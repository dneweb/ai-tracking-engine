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
        <div className="mt-6 border-t border-[#3a3a3a] pt-6 space-y-6">
            <div className="flex items-center gap-2 text-purple-400 mb-4">
                <Bot className="w-5 h-5" />
                <h4 className="font-semibold text-lg">AI Deep Discovery</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Insights Panel */}
                <div className="space-y-4">
                    <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
                        <div className="flex items-center gap-2 text-blue-400 mb-2">
                            <Lightbulb className="w-4 h-4" />
                            <h5 className="font-medium">What Employees Want to Know</h5>
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed">{insights.what_employees_want_to_know}</p>
                    </div>

                    <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
                        <div className="flex items-center gap-2 text-orange-400 mb-2">
                            <FileEdit className="w-4 h-4" />
                            <h5 className="font-medium">Why Current Documentation Fails</h5>
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed">{insights.why_current_sop_fails}</p>
                    </div>

                    <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
                        <div className="flex items-baseline justify-between mb-2">
                            <h5 className="font-medium text-green-400">Action Plan Example</h5>
                            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30">
                                {rec.confidence}% Confidence
                            </span>
                        </div>
                        <div className="text-sm text-gray-300">
                            <strong>Identify:</strong> {rec.problem}
                        </div>
                        <div className="text-sm text-gray-300 mt-2">
                            <strong>Action:</strong> {rec.action}
                        </div>
                    </div>
                </div>

                {/* Auto-Drafted SOP Panel */}
                <div className="bg-[#0f0f0f] rounded-xl border border-purple-500/30 overflow-hidden flex flex-col h-full">
                    <div className="bg-purple-500/10 px-4 py-3 border-b border-purple-500/20 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-purple-300">
                            <CheckCircle2 className="w-4 h-4" />
                            <h5 className="font-medium text-sm">AI-Drafted Knowledge Base Update</h5>
                        </div>
                        <span className="text-xs text-purple-400/70 italic">Review before implementing.</span>
                    </div>
                    <div className="p-4 flex-1">
                        <div className="bg-[#1a1a1a] rounded-lg p-4 h-full border border-[#2a2a2a] text-sm text-gray-300 font-mono whitespace-pre-wrap overflow-y-auto max-h-[300px] fancy-scrollbar">
                            {analysis.auto_sop_rewrite}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
