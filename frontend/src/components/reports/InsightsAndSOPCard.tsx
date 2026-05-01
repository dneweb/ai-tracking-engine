import { type TopicCluster } from "@/lib/api";
import { Bot, Lightbulb, FileEdit, CheckCircle2, ShieldAlert, Zap, History } from "lucide-react";
import { Link002, Link003 } from "@/components/ui/skiper-ui/skiper40";

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
            <div className="flex flex-wrap items-center justify-between gap-6 mb-12">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-3xl bg-[var(--brand-soft)] border border-[var(--brand-glow)] flex items-center justify-center text-[var(--brand)] shadow-lg shadow-[var(--brand-soft)]">
                        <Bot className="w-8 h-8" />
                    </div>
                    <div>
                        <h4 className="font-bold text-3xl tracking-tight text-[var(--text-primary)]" style={{ fontFamily: "var(--font-display)" }}>Neural Deep Discovery</h4>
                        <p className="text-[clamp(0.5rem,1.0vw,0.625rem)] font-bold uppercase tracking-[0.3em] text-[var(--text-muted)] mt-1">Multi-modal interaction synthesis v3.0</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <Link002 href="#" className="text-[clamp(0.5rem,1.0vw,0.625rem)] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Audit Trail</Link002>
                    <Link003 href="#" className="text-[clamp(0.5rem,1.0vw,0.625rem)] font-bold uppercase tracking-[0.2em] text-[var(--brand)]">Recalibrate Logic</Link003>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-10">
                {/* Insights Panel */}
                <div className="space-y-10">
                    <div className="group relative p-8 rounded-[2.5rem] bg-[var(--bg-secondary)]/50 border border-[var(--border-subtle)] hover:border-[var(--brand-glow)] transition-all duration-700">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--brand-soft)] blur-3xl opacity-0 group-hover:opacity-30 transition-opacity" />
                        <div className="relative z-10 space-y-4">
                            <div className="flex items-center gap-3 text-[var(--brand)]">
                                <Zap className="w-5 h-5" />
                                <h5 className="font-extrabold text-[clamp(0.55rem,1.1vw,0.6875rem)] uppercase tracking-[0.3em]">Trace Induction</h5>
                            </div>
                            <p className="text-lg text-[var(--text-primary)] leading-relaxed font-bold italic tracking-tight break-words" style={{ fontFamily: "var(--font-display)" }}>
                                {insights.what_employees_want_to_know}
                            </p>
                        </div>
                    </div>

                    <div className="group relative p-8 rounded-[2.5rem] bg-[var(--bg-secondary)]/50 border border-[var(--border-subtle)] hover:border-[var(--warning-ring)] transition-all duration-700">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--warning-soft)] blur-3xl opacity-0 group-hover:opacity-30 transition-opacity" />
                        <div className="relative z-10 space-y-4">
                            <div className="flex items-center gap-3 text-[var(--warning)]">
                                <ShieldAlert className="w-5 h-5" />
                                <h5 className="font-extrabold text-[clamp(0.55rem,1.1vw,0.6875rem)] uppercase tracking-[0.3em]">Failure Vector</h5>
                            </div>
                            <p className="text-[clamp(0.75rem,1.5vw,0.9375rem)] text-[var(--text-secondary)] leading-relaxed font-medium break-words">
                                {insights.why_current_sop_fails}
                            </p>
                        </div>
                    </div>

                    <div className="group relative p-10 rounded-[3.0rem] bg-[var(--card-bg)] border border-[var(--border-strong)] shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-lg)] transition-all duration-700 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-[var(--success-soft)] to-transparent opacity-0 group-hover:opacity-10 transition-opacity" />
                        <div className="relative z-10 space-y-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 text-[var(--success)]">
                                    <CheckCircle2 className="w-5 h-5" />
                                    <h5 className="font-extrabold text-[clamp(0.55rem,1.1vw,0.6875rem)] uppercase tracking-[0.3em]">Proposed Resolution</h5>
                                </div>
                                <span className="text-[clamp(0.45rem,0.9vw,0.5625rem)] font-bold bg-[var(--success)] text-white px-4 py-1.5 rounded-full shadow-lg shadow-[var(--success-soft)] uppercase tracking-[0.1em]">
                                    {rec.confidence}% Precision
                                </span>
                            </div>
                            <div className="grid gap-6">
                                <div className="p-6 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                                    <strong className="block text-[clamp(0.45rem,0.9vw,0.5625rem)] font-bold text-[var(--success)] uppercase tracking-[0.2em] mb-2">Primary Symptom</strong>
                                    <p className="text-[clamp(0.75rem,1.5vw,0.9375rem)] text-[var(--text-primary)] font-medium leading-relaxed">{rec.problem}</p>
                                </div>
                                <div className="p-6 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                                    <strong className="block text-[clamp(0.45rem,0.9vw,0.5625rem)] font-bold text-[var(--success)] uppercase tracking-[0.2em] mb-2">Corrective Manoeuvre</strong>
                                    <p className="text-[clamp(0.75rem,1.5vw,0.9375rem)] text-[var(--text-primary)] font-medium leading-relaxed">{rec.action}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Auto-Drafted SOP Panel */}
                <div className="bg-[var(--bg-primary)] rounded-[3.0rem] border border-[var(--brand)]/20 shadow-[var(--card-shadow-lg)] overflow-hidden flex flex-col h-full group/sop">
                    <div className="bg-[var(--brand)]/5 px-10 py-8 border-b border-[var(--brand)]/10 flex flex-wrap items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-[var(--brand)] flex items-center justify-center text-white shadow-xl shadow-[var(--brand-soft)] group-hover/sop:scale-110 transition-transform duration-700">
                                <History className="w-6 h-6" />
                            </div>
                            <div>
                                <h5 className="font-bold text-xl tracking-tight text-[var(--text-primary)]" style={{ fontFamily: "var(--font-display)" }}>Neural SOP Rewrite</h5>
                                <p className="text-[clamp(0.45rem,0.9vw,0.5625rem)] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] mt-0.5">Automated document synthesis</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-[var(--brand-soft)] border border-[var(--brand-glow)]">
                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--brand)] animate-pulse" />
                            <span className="text-[clamp(0.5rem,1.0vw,0.625rem)] font-extrabold text-[var(--brand)] uppercase tracking-widest">Review Authorization Pending</span>
                        </div>
                    </div>
                    <div className="p-8 flex-1 min-w-0">
                        <div className="bg-[var(--bg-secondary)] rounded-lg p-6 h-full border border-[var(--border-subtle)] text-sm text-[var(--text-secondary)] font-medium whitespace-pre-wrap overflow-y-auto overflow-x-hidden max-h-[clamp(20.0rem,40.0vw,25.0rem)] fancy-scrollbar break-words">
                            {typeof analysis.auto_sop_rewrite === 'string' ? (
                                analysis.auto_sop_rewrite
                            ) : analysis.auto_sop_rewrite && typeof analysis.auto_sop_rewrite === 'object' ? (
                                <div className="space-y-6">
                                    {Object.entries(analysis.auto_sop_rewrite).map(([key, value]) => {
                                        if (!value) return null;
                                        const label = key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                                        return (
                                            <div key={key} className="space-y-2">
                                                <h6 className="text-[clamp(0.55rem,1.1vw,0.6875rem)] font-bold text-[var(--brand)] uppercase tracking-widest">{label}</h6>
                                                <div className="text-[clamp(0.65rem,1.3vw,0.8125rem)] leading-relaxed text-[var(--text-primary)]">
                                                    {Array.isArray(value) ? (
                                                        <ul className="list-disc pl-5 space-y-1">
                                                            {value.map((item, i) => (
                                                                <li key={i}>
                                                                    {typeof item === 'object' && item !== null ? (
                                                                        <span>
                                                                            {item.section && <strong className="block mb-1">{item.section}</strong>}
                                                                            {item.content || JSON.stringify(item)}
                                                                        </span>
                                                                    ) : (
                                                                        item
                                                                    )}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : typeof value === 'object' && value !== null ? (
                                                        <span>
                                                            {value.section && <strong className="block mb-1">{value.section}</strong>}
                                                            {value.content || JSON.stringify(value)}
                                                        </span>
                                                    ) : (
                                                        value
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                "No neural rewrite available."
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
