"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  AlertTriangle, ChevronsUpDown, Clock, Search, Download,
  Sparkles, Filter, ArrowRight, CheckCircle2, Activity,
  Loader2, RefreshCw, PartyPopper, Zap, ChevronRight,
  ShieldCheck, FileText, Settings2, BarChart3, Database
} from "lucide-react";
import ReportFilters from "@/components/reports/ReportFilters";
import ExecutiveSummaryCard from "@/components/reports/ExecutiveSummaryCard";
import TopicClusterCard from "@/components/reports/TopicClusterCard";
import TopicClusterSkeleton from "@/components/reports/TopicClusterSkeleton";
import { exportSOPReportPdf, getSOPReport } from "@/lib/api";
import type { SOPReport, TopicCluster } from "@/lib/api";
import { useAuth } from "@clerk/nextjs";
import { useRole } from "@/hooks/useRole";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.19, 1, 0.22, 1] } },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.1 } },
};

export default function ReportsPage() {
  const { getToken } = useAuth();
  const { isAdmin, isLoaded: roleLoaded } = useRole();
  const router = useRouter();

  const [report, setReport] = useState<SOPReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const [resolvedLocal, setResolvedLocal] = useState<Array<{ cluster: TopicCluster; notes: string; resolvedAt: string }>>([]);

  const [days, setDays] = useState(30);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.6);
  const [minClusterSize, setMinClusterSize] = useState(2);
  const [filtersChanged, setFiltersChanged] = useState(false);
  const [globalExpand, setGlobalExpand] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (roleLoaded && !isAdmin) router.push("/");
  }, [roleLoaded, isAdmin, router]);

  const handleFilterChange = <T,>(setter: (v: T) => void) => (value: T) => {
    setter(value);
    if (report) setFiltersChanged(true);
  };

  const generateReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    setFiltersChanged(false);
    setGlobalExpand(undefined);
    setResolvedLocal([]);
    try {
      const token = await getToken();
      const data = await getSOPReport({ days, confidence_threshold: confidenceThreshold, min_cluster_size: minClusterSize }, token || undefined);
      setReport(data);
    } catch (err) {
      setError("Neural analysis pipeline synchronization failed.");
      console.error(err);
    } finally {
      setTimeout(() => setLoading(false), 800); // Add slight delay for high-fidelity transition
    }
  }, [days, confidenceThreshold, minClusterSize, getToken]);

  const downloadPdf = useCallback(async () => {
    setPdfLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const blob = await exportSOPReportPdf({ days, confidence_threshold: confidenceThreshold, min_cluster_size: minClusterSize }, token || undefined);
      const url = URL.createObjectURL(blob);
      const a = document.body.appendChild(document.createElement("a"));
      a.href = url;
      a.download = `neural-report-${new Date().toISOString().split("T")[0]}.pdf`;
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setPdfLoading(false);
    }
  }, [days, confidenceThreshold, minClusterSize, getToken]);

  const handleResolved = useCallback((cluster: TopicCluster, notes: string) => {
    setResolvedLocal(prev => [{ cluster, notes, resolvedAt: new Date().toISOString() }, ...prev]);
    setReport(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        clusters: prev.clusters.filter(c => c.cluster_id !== cluster.cluster_id),
        summary: {
          ...prev.summary,
          clusters_identified: Math.max(0, prev.summary.clusters_identified - 1),
          high_priority_count: Math.max(0, prev.summary.high_priority_count - (cluster.priority === "high" ? 1 : 0)),
          medium_priority_count: Math.max(0, prev.summary.medium_priority_count - (cluster.priority === "medium" ? 1 : 0)),
          low_priority_count: Math.max(0, prev.summary.low_priority_count - (cluster.priority === "low" ? 1 : 0)),
        },
      };
    });
  }, []);

  const groups = useMemo(() => ({
    high:   report?.clusters.filter(c => c.priority === "high")   ?? [],
    medium: report?.clusters.filter(c => c.priority === "medium") ?? [],
    low:    report?.clusters.filter(c => c.priority === "low")    ?? [],
  }), [report]);

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
    } catch { return iso; }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-12 md:py-20 space-y-12">

      {/* ── Page Header: Cinematic Header ── */}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <motion.div variants={fadeUp} initial="initial" animate="animate">
          <h1 className="text-[clamp(2.5rem,8vw,4.5rem)] font-bold tracking-tight text-[var(--text-primary)]" style={{ fontFamily: "var(--font-display)" }}>
            Deep <span className="text-[var(--brand)]">Reports.</span>
          </h1>
          <p className="text-[13px] font-semibold text-[var(--text-muted)] tracking-widest uppercase mt-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[var(--brand)]" />
            Automated intelligence · SOP gap detection · {report?.clusters.length || 0} active voids
          </p>
        </motion.div>

        <motion.div 
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
        >
          {report && (
            <Button
              variant="outline"
              onClick={downloadPdf}
              disabled={loading || pdfLoading}
              className="rounded-2xl px-8 py-7 h-auto font-bold uppercase tracking-widest text-[10px] gap-3 active:scale-95"
            >
              {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {pdfLoading ? "Synching..." : "Export Intelligence"}
            </Button>
          )}
          <Button
            onClick={generateReport}
            disabled={loading || pdfLoading}
            className="rounded-2xl px-8 py-7 h-auto font-bold uppercase tracking-widest text-[10px] bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white shadow-xl shadow-[var(--brand-soft)] gap-3 active:scale-95"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {loading ? "Calculating..." : "Sync Analysis"}
          </Button>
        </motion.div>
      </div>

      {/* ── Neural Parameter Hub ── */}
      <motion.div
        variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.1 }}
        className="p-10 md:p-14 rounded-[48px] bg-[var(--card-bg)] border border-[var(--border-subtle)] shadow-[var(--card-shadow)] relative overflow-hidden group"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--brand-soft)] blur-[100px] opacity-20 pointer-events-none" />
        
        <div className="relative z-10 space-y-10">
          <div className="flex items-center gap-4 pb-6 border-b border-[var(--border-subtle)]">
            <div className="w-12 h-12 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--brand)]">
               <Settings2 className="w-6 h-6" />
            </div>
            <div>
               <h3 className="text-[13px] font-extrabold text-[var(--text-primary)] uppercase tracking-[0.3em]">Neural Parameter Hub</h3>
               <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-1">Configure recursive analysis constraints</p>
            </div>
          </div>
          <ReportFilters
            days={days}
            confidenceThreshold={confidenceThreshold}
            minClusterSize={minClusterSize}
            onDaysChange={handleFilterChange(setDays)}
            onThresholdChange={handleFilterChange(setConfidenceThreshold)}
            onMinClusterSizeChange={handleFilterChange(setMinClusterSize)}
            disabled={loading}
          />
        </div>
      </motion.div>

      {/* Stale Intel Warning */}
      <AnimatePresence>
        {filtersChanged && report && !loading && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="px-8 py-5 rounded-[24px] bg-[var(--warning-soft)] border border-[var(--warning-ring)] flex flex-wrap items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/40 flex items-center justify-center text-[var(--warning)]">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-[var(--warning)] uppercase tracking-[0.1em]">Stale Intelligence Detected</p>
                <p className="text-[10px] font-bold text-[var(--warning)]/60 uppercase tracking-widest mt-0.5">Cached results based on older configuration parameters</p>
              </div>
            </div>
            <Button 
                variant="outline" onClick={generateReport}
                className="rounded-xl px-6 py-2 h-auto text-[9px] font-bold uppercase tracking-widest border-[var(--warning-ring)] text-[var(--warning)] hover:bg-[var(--warning-soft)]"
            >
              Re-Synchronize
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Content Area ── */}
      <div className="min-h-[600px] relative">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
                key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-40 gap-10"
            >
              <div className="relative">
                <div className="w-24 h-24 border-4 border-[var(--brand-soft)] border-t-[var(--brand)] rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-[var(--brand)] animate-pulse" />
                </div>
                <div className="absolute inset-x-0 -bottom-12 flex flex-col items-center gap-3">
                   <p className="text-[11px] font-bold text-[var(--brand)] uppercase tracking-[0.5em] animate-pulse">Engaging Synthesis</p>
                   <div className="w-40 h-1 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ x: "-100%" }} animate={{ x: "0%" }} transition={{ duration: 1.5, repeat: Infinity }}
                        className="w-full h-full bg-[var(--brand)]" 
                      />
                   </div>
                </div>
              </div>
              <div className="space-y-4 opacity-30 w-full max-w-4xl blur-[2px] pointer-events-none">
                {[1, 2].map(i => <TopicClusterSkeleton key={i} />)}
              </div>
            </motion.div>
          ) : error ? (
            <motion.div 
                key="error" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="py-32 flex flex-col items-center text-center gap-8 rounded-[48px] border border-[var(--danger-ring)] bg-[var(--bg-secondary)]/30 backdrop-blur-xl"
            >
              <div className="w-20 h-20 rounded-[28px] bg-[var(--danger-soft)] border border-[var(--danger-ring)] flex items-center justify-center text-[var(--danger)]">
                <AlertTriangle className="w-10 h-10" />
              </div>
              <div className="space-y-3">
                <h3 className="text-3xl font-bold text-[var(--text-primary)]" style={{ fontFamily: "var(--font-display)" }}>Analysis pipeline fault</h3>
                <p className="text-[14px] font-medium text-[var(--text-muted)] max-w-sm uppercase tracking-widest">{error}</p>
              </div>
              <Button onClick={generateReport} className="rounded-2xl px-12 py-6 h-auto text-[11px] font-bold uppercase tracking-widest bg-[var(--brand)] text-white">Retry Neural Scan</Button>
            </motion.div>
          ) : report ? (
            <motion.div 
                key="report" initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
                className="space-y-24"
            >
              {/* Executive Summary Section */}
              <div className="space-y-12">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--brand-soft)] border border-[var(--brand-glow)] flex items-center justify-center text-[var(--brand)]">
                     <Database className="w-6 h-6" />
                  </div>
                  <div>
                     <h3 className="text-[13px] font-extrabold text-[var(--text-primary)] uppercase tracking-[0.3em]">Executive Synthesis</h3>
                     <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-1">High-level impact assessment engine · {report.period}</p>
                  </div>
                </div>
                <ExecutiveSummaryCard summary={report.summary} productivity={report.productivity_impact} />
                
                {/* Meta Control Bar */}
                <div className="flex flex-wrap items-center justify-between gap-6 pt-12 border-t border-[var(--border-subtle)]">
                   <div className="flex flex-wrap items-center gap-8">
                      <div className="flex items-center gap-3">
                         <div className="w-9 h-9 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-muted)]"><Clock className="w-4 h-4" /></div>
                         <div>
                            <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Temporal Point</p>
                            <p className="text-[10px] font-bold text-[var(--text-primary)] uppercase">{formatTime(report.generated_at)}</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-3">
                         <div className="w-9 h-9 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-muted)]"><Settings2 className="w-4 h-4" /></div>
                         <div>
                            <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Neural constraints</p>
                            <p className="text-[10px] font-bold text-[var(--text-primary)] uppercase">{report.filters_used.confidence_threshold * 100}% precision · {report.filters_used.min_cluster_size} hits</p>
                         </div>
                      </div>
                   </div>
                   
                   <Button 
                        variant="ghost" onClick={() => setGlobalExpand(globalExpand === true ? false : true)}
                        className="rounded-xl px-6 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] gap-3 bg-[var(--bg-secondary)]/50"
                   >
                     <ChevronsUpDown className="w-4 h-4" />
                     {globalExpand === true ? "Collapse Voids" : "Cascade Neural View"}
                   </Button>
                </div>
              </div>

              {/* Discovery States */}
              {report.summary.total_low_confidence === 0 ? (
                <div className="py-32 flex flex-col items-center text-center gap-8 rounded-[48px] border border-[var(--success-ring)] bg-[var(--bg-secondary)]/30 backdrop-blur-xl">
                   <div className="w-20 h-20 rounded-[28px] bg-[var(--success-soft)] border border-[var(--success-ring)] flex items-center justify-center text-[var(--success)] shadow-xl shadow-[var(--success-soft)]">
                     <CheckCircle2 className="w-10 h-10" />
                   </div>
                   <div className="space-y-3">
                     <h3 className="text-3xl font-bold text-[var(--text-primary)]" style={{ fontFamily: "var(--font-display)" }}>Neural equilibrium achieved</h3>
                     <p className="text-[14px] font-medium text-[var(--text-muted)] max-w-sm uppercase tracking-widest leading-relaxed">All {report.summary.total_queries_in_period} interactions processed with maximum high-fidelity signatures.</p>
                   </div>
                </div>
              ) : report.summary.clusters_identified === 0 ? (
                <div className="py-32 flex flex-col items-center text-center gap-8 rounded-[48px] border border-[var(--warning-ring)] bg-[var(--bg-secondary)]/30 backdrop-blur-xl">
                   <div className="w-20 h-20 rounded-[28px] bg-[var(--warning-soft)] border border-[var(--warning-ring)] flex items-center justify-center text-[var(--warning)] shadow-xl shadow-[var(--warning-soft)]">
                     <Activity className="w-10 h-10" />
                   </div>
                   <div className="space-y-3">
                     <h3 className="text-3xl font-bold text-[var(--text-primary)]" style={{ fontFamily: "var(--font-display)" }}>Diffuse signals identified</h3>
                     <p className="text-[14px] font-medium text-[var(--text-muted)] max-w-sm uppercase tracking-widest leading-relaxed">{report.summary.total_low_confidence} anomalous data points found, but density thresholds for clustering were not met.</p>
                   </div>
                </div>
              ) : (
                <div className="space-y-32">
                  <ClusterSection clusters={groups.high}   title="Critical Evidence Gaps" color="var(--danger)" defaultExpanded={true}  forceExpanded={globalExpand} onResolved={handleResolved} />
                  <ClusterSection clusters={groups.medium} title="Structural Inconsistencies"     color="var(--warning)"     defaultExpanded={false} forceExpanded={globalExpand} onResolved={handleResolved} />
                  <ClusterSection clusters={groups.low}    title="Trace Fluctuations" color="var(--success)" defaultExpanded={false} forceExpanded={globalExpand} onResolved={handleResolved} />
                  
                  {/* Resolution Archive Area */}
                  <div className="flex flex-col items-center gap-10 py-16 pt-32">
                     <div className="w-px h-24 bg-gradient-to-t from-[var(--brand)] to-transparent" />
                     <button
                        onClick={() => setShowResolved(!showResolved)}
                        className={cn(
                          "px-12 py-6 rounded-[32px] text-[11px] font-bold uppercase tracking-[0.3em] transition-all shadow-xl active:scale-95 flex items-center gap-4",
                          showResolved 
                            ? "bg-[var(--text-primary)] text-white" 
                            : "bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[var(--brand)]"
                        )}
                     >
                        History of knowledge resolution
                        <span className="w-6 h-6 rounded-full bg-[var(--brand)] text-white flex items-center justify-center text-[9px] font-extrabold">{resolvedLocal.length}</span>
                     </button>

                     <AnimatePresence>
                        {showResolved && resolvedLocal.length > 0 && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.98, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: 20 }}
                            className="w-full space-y-10 pt-20"
                          >
                             <div className="flex items-center gap-4">
                               <ShieldCheck className="w-6 h-6 text-[var(--success)]" />
                               <h2 className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: "var(--font-display)" }}>Resolved Intelligence Trails</h2>
                             </div>
                             <div className="grid gap-8 opacity-60 hover:opacity-100 transition-opacity grayscale hover:grayscale-0 duration-700">
                               {resolvedLocal.map(r => (
                                 <TopicClusterCard key={`res-${r.cluster.cluster_id}`} cluster={r.cluster} showResolveAction={false} />
                               ))}
                             </div>
                          </motion.div>
                        )}
                     </AnimatePresence>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
             /* Initial Zero State */
             <motion.div 
                key="zero" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="py-20 grid grid-cols-1 md:grid-cols-3 gap-10"
             >
                {[
                  { icon: Zap, label: "Gap Induction", desc: "Autonomous scanning of interaction logs to identify structural documentation voids." },
                  { icon: BarChart3, label: "Impact Analysis", desc: "Productivity loss projection engine based on neural recurrence patterns." },
                  { icon: ShieldCheck, label: "SOP Validation", desc: "Verification cycles for standard operating procedures against live system trace." }
                ].map((f, i) => (
                  <motion.div 
                    key={i} variants={fadeUp} initial="initial" animate="animate" transition={{ delay: i * 0.1 }}
                    className="p-12 rounded-[48px] bg-[var(--card-bg)] border border-[var(--border-subtle)] shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-lg)] hover:border-[var(--brand)] transition-all duration-700 relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--brand-soft)] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10 space-y-8">
                       <div className="w-14 h-14 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--brand)] group-hover:scale-110 group-hover:rotate-6 transition-all duration-700">
                         <f.icon className="w-6 h-6" />
                       </div>
                       <div className="space-y-3">
                          <h3 className="text-[12px] font-extrabold text-[var(--text-primary)] uppercase tracking-[0.3em]">{f.label}</h3>
                          <p className="text-[13px] text-[var(--text-muted)] font-medium leading-relaxed leading-relaxed">{f.desc}</p>
                       </div>
                    </div>
                  </motion.div>
                ))}
             </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ClusterSection({ clusters, title, color, defaultExpanded, forceExpanded, onResolved }: {
  clusters: TopicCluster[];
  title: string;
  color: string;
  defaultExpanded: boolean;
  forceExpanded?: boolean;
  onResolved: (c: TopicCluster, notes: string) => void;
}) {
  if (clusters.length === 0) return null;
  return (
    <motion.section variants={stagger} initial="initial" animate="animate" className="space-y-12">
      <div className="flex items-center gap-6">
        <h2 className="text-[12px] font-extrabold uppercase tracking-[0.4em] flex items-center gap-4" style={{ color }}>
          {title}
          <div className="px-3 py-1 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[10px] text-[var(--text-muted)]">{clusters.length}</div>
        </h2>
        <div className="flex-1 h-px bg-gradient-to-r from-[var(--border-subtle)] to-transparent" style={{ borderColor: color }} />
      </div>
      <div className="grid gap-10">
        {clusters.map((c, i) => (
          <TopicClusterCard
            key={c.cluster_id}
            cluster={c}
            defaultExpanded={defaultExpanded}
            forceExpanded={forceExpanded}
            onResolved={onResolved}
          />
        ))}
      </div>
    </motion.section>
  );
}
