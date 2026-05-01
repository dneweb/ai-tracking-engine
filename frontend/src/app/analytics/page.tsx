"use client";

import { useEffect, useState, useMemo } from "react";
import {
  getQueries, getDocuments, getAnalyticsStats,
  Query, Document, AnalyticsStats,
} from "@/lib/api";
import {
  Target, AlertTriangle, Activity, ShieldCheck,
  ChevronRight, Zap, Download, FileText, Clock,
  TrendingUp, ArrowUpRight, ArrowDownRight, Search, BarChart3, PieChart,
  MessageSquare
} from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useToast } from "@/context/ToastContext";
import { useRole } from "@/hooks/useRole";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, Variants } from "framer-motion";
import CountUp from "react-countup";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

/* ─── Motion Variants ───────────────────────────────────── */
const fadeUp: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0, 0, 0.2, 1] } },
};

const stagger: Variants = {
  animate: { transition: { staggerChildren: 0.08 } },
};

/* ─── Mini sparkline (SVG) ─────────────────────────────── */
function Sparkline({ seed, color }: { seed: number; color: string }) {
  const p = [25, 20, 15, 22, 10, 18, 5];
  const j = (seed % 10) - 5;
  const pts = p.map((v) => Math.max(2, Math.min(28, v + j)));
  const path = `M0,${pts[0]} Q10,${pts[1]} 20,${pts[2]} T40,${pts[3]} T60,${pts[4]} T80,${pts[5]} T100,${pts[6]}`;
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-20 h-6">
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" className="opacity-50" />
    </svg>
  );
}

/* ─── Metric card ──────────────────────────────────────── */
function MetricCard({
  label, value, unit, icon: Icon, accent, index, trend,
}: {
  label: string; value: number; unit: string;
  icon: React.ElementType; accent: string;
  index: number; trend?: { value: string; positive: boolean };
}) {
  return (
    <motion.div
      variants={fadeUp}
      className="group relative p-8 rounded-[2.5rem] glass border border-[var(--border-subtle)] shadow-xl hover:shadow-[0_24px_64px_rgba(0,0,0,0.15)] hover:border-[var(--brand)] transition-all duration-700 overflow-hidden ring-1 ring-white/10"
    >
      <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-[var(--brand-glow)] to-transparent blur-[5.0rem] opacity-0 group-hover:opacity-40 transition-opacity duration-1000 pointer-events-none" />
      <div className="flex justify-between items-start mb-8 relative z-10">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-muted)] group-hover:bg-[var(--brand)] group-hover:text-white group-hover:shadow-[0_0.75rem 2rem rgba(var(--brand-rgb),0.4)] transition-all duration-700">
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[clamp(0.55rem,1.1vw,0.6875rem)] font-bold tracking-tight shadow-sm border",
            trend.positive ? "bg-[var(--success-soft)] text-[var(--success)] border-[var(--success-ring)]" : "bg-[var(--danger-soft)] text-[var(--danger)] border-[var(--danger-ring)]"
          )}>
            {trend.positive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {trend.value}
          </div>
        )}
      </div>

      <div className="space-y-2 relative z-10">
        <div className="flex items-baseline gap-2">
          <span className="text-[clamp(2.5rem,5vw,3rem)] font-bold tracking-tight text-[var(--text-primary)]">
            <CountUp end={value} duration={2.5} decimals={unit === "%" ? 0 : 0} />
          </span>
          <span className="text-[clamp(1rem,2vw,1.25rem)] font-bold text-[var(--text-muted)] opacity-60">{unit}</span>
        </div>
        <p className="text-[clamp(0.55rem,1.1vw,0.6875rem)] font-bold tracking-[0.3em] uppercase text-[var(--text-muted)] group-hover:text-[var(--brand)] transition-all duration-500">
          {label}
        </p>
      </div>

      <div className="absolute bottom-0 left-10 right-10 h-1.5 bg-gradient-to-r from-transparent via-[var(--brand)] to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700 rounded-t-full" style={{ backgroundColor: accent }} />
    </motion.div>
  );
}

/* ─── Page Component ─────────────────────────────────── */
export default function AnalyticsPage() {
  const { getToken } = useAuth();
  const { showToast } = useToast();
  const { isAdmin, isLoaded: roleLoaded } = useRole();
  const { member } = useCurrentMember();
  const router = useRouter();

  const [queries, setQueries] = useState<Query[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartRange, setChartRange] = useState<"7d" | "30d" | "all">("30d");

  useEffect(() => {
    if (roleLoaded && !isAdmin) router.push("/");
  }, [roleLoaded, isAdmin, router]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const token = await getToken();
        const orgId = member?.org_id ?? "";
        if (token) {
          const [qData, dData, sData] = await Promise.all([
            getQueries(token, orgId),
            getDocuments(token, orgId),
            getAnalyticsStats(30, token || "", orgId),
          ]);
          setQueries(qData);
          setDocuments(dData);
          setStats(sData);
        }
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [getToken, member]);

  const avgConf = stats?.avg_confidence !== undefined
    ? stats.avg_confidence
    : queries.length > 0 ? queries.reduce((s, q) => s + q.confidence, 0) / queries.length : 0;

  const topMetrics = [
    { label: "Neural Precision", value: Math.round(avgConf), unit: "%", icon: Target, accent: "var(--brand)", trend: { value: "+2.4%", positive: true } },
    { label: "Total Interactions", value: queries.length, unit: "", icon: Activity, accent: "var(--info)", trend: { value: "+12%", positive: true } },
    { label: "Synced Assets", value: documents.length, unit: "", icon: ShieldCheck, accent: "var(--success)", trend: { value: "+5", positive: true } },
    { label: "Neural Anomalies", value: queries.filter(q => q.confidence < 60).length, unit: "", icon: AlertTriangle, accent: "var(--danger)", trend: { value: "-14%", positive: true } },
  ];

  /* ── Temporal velocity chart logic ────────────────────────── */
  const { temporalVelocity } = useMemo(() => {
    const now = Date.now();
    let windowMs = (chartRange === "7d" ? 7 : 30) * 864e5;
    const buckets = chartRange === "7d" ? 7 : 10;

    // Filter out invalid dates to prevent NaN in calculations
    const validQueries = queries.filter(q => {
      const d = new Date(q.date).getTime();
      return !isNaN(d) && d > 0;
    });

    if (chartRange === "all" && validQueries.length > 0) {
      const minDate = Math.min(...validQueries.map(q => new Date(q.date).getTime()));
      windowMs = Math.max(now - minDate, 7 * 864e5);
    }

    const bucketMs = windowMs / buckets;
    const buf = Array.from({ length: buckets }, () => ({ count: 0, label: "" }));

    for (let i = 0; i < buckets; i++) {
      const d = new Date(now - i * bucketMs);
      buf[buckets - 1 - i].label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
    }

    if (validQueries.length > 0) {
      validQueries.forEach((q) => {
        let diff = now - new Date(q.date).getTime();
        if (diff < 0) diff = 0;
        if (diff <= windowMs) {
          let idx = buckets - 1 - Math.floor(diff / bucketMs);
          idx = Math.max(0, Math.min(buckets - 1, idx));
          buf[idx].count++;
        }
      });
    }

    const max = Math.max(1, ...buf.map(b => b.count));
    return { temporalVelocity: buf.map(b => ({ label: b.label, count: b.count, pct: (b.count / max) * 100 })) };
  }, [queries, chartRange]);

  const reliabilityStats = useMemo(() => {
    const high = queries.filter(q => q.confidence >= 80).length;
    const med = queries.filter(q => q.confidence >= 60 && q.confidence < 80).length;
    const low = queries.filter(q => q.confidence < 60).length;
    const total = queries.length || 1;
    return [
      { label: "High Precision", value: high, pct: Math.round((high / total) * 100), color: "var(--success)" },
      { label: "Marginal Sync", value: med, pct: Math.round((med / total) * 100), color: "var(--warning)" },
      { label: "Critical Gaps", value: low, pct: Math.round((low / total) * 100), color: "var(--danger)" },
    ];
  }, [queries]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-[var(--brand-soft)] border-t-[var(--brand)] rounded-full animate-spin" />
          <div className="absolute inset-0 bg-[var(--brand)] blur-2xl opacity-20 animate-pulse" />
        </div>
        <p className="text-[clamp(0.55rem,1.1vw,0.6875rem)] font-bold tracking-[0.3em] uppercase text-[var(--text-muted)] animate-pulse">
          {roleLoaded && !member ? "No organisation found" : "Synthesizing Neural Metrics"}
        </p>
      </div>
    );
  }

  return (
    <div className="container-app py-12 md:py-20 space-y-12">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 15, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between mb-16"
      >
        <div className="space-y-4 md:space-y-5">
          <h1 className="text-[clamp(2.5rem,8vw,5.5rem)] font-bold tracking-tight text-[var(--text-primary)] leading-[0.9] md:leading-[0.85]">
            Intelligence <span className="brand-gradient-text">Insights.</span>
          </h1>
          <div className="flex items-center gap-4">
            <div className="w-2 md:w-2.5 h-2 md:h-2.5 rounded-full bg-[var(--brand)] animate-glow-pulse shadow-[0_0_12px_var(--brand)]" />
            <p className="text-[clamp(0.5rem,1.0vw,0.625rem)] md:text-[clamp(0.6rem,1.2vw,0.75rem)] font-bold text-[var(--text-muted)] tracking-[0.2em] md:tracking-[0.3em] uppercase">
              Live temporal metrics · System efficiency audit
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => showToast("Metric manifest preparation active...", "success")}
            className="rounded-2xl px-10 min-h-[3.75rem] font-bold uppercase tracking-[0.2em] text-[clamp(0.55rem,1.1vw,0.6875rem)] gap-3 glass-strong border-[var(--border-subtle)] hover:border-[var(--brand)] transition-all w-full lg:w-auto"
          >
            <Download className="w-5 h-5" /> Export Synthesis
          </Button>
        </div>
      </motion.div>

      {/* ── Metric Cards ── */}
      <motion.div variants={stagger} initial="initial" animate="animate" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {topMetrics.map((m, i) => (
          <MetricCard key={i} {...m} index={i} />
        ))}
      </motion.div>

      {/* ── Charts Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Temporal Velocity Chart */}
        <motion.div
          variants={fadeUp} initial="initial" animate="animate"
          className="lg:col-span-2 p-10 md:p-12 rounded-[3.0rem] glass-strong shadow-2xl hover:shadow-[0_32px_80px_rgba(0,0,0,0.2)] hover:border-[var(--brand)] transition-all duration-700 flex flex-col ring-1 ring-white/5 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-80 h-80 bg-[var(--brand-glow)] blur-[7.5rem] opacity-0 group-hover:opacity-40 transition-opacity duration-1000 pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8 mb-12 relative z-10">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center bg-gradient-to-br from-[var(--brand)] to-[#8b5cf6] text-white shadow-xl shadow-[var(--brand-glow)]">
                <TrendingUp className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">Temporal Velocity</h3>
                <p className="text-[clamp(0.55rem,1.1vw,0.6875rem)] font-bold uppercase tracking-[0.25em] text-[var(--text-muted)] mt-1">Interaction frequency over time</p>
              </div>
            </div>
            <div className="flex p-1.5 rounded-[1.25rem] glass shadow-inner border border-[var(--border-subtle)]">
              {(["7d", "30d", "all"] as const).map(r => (
                <button
                  key={r} onClick={() => setChartRange(r)}
                  className={cn("px-6 py-2.5 rounded-[0.875rem] text-[clamp(0.55rem,1.1vw,0.6875rem)] font-bold uppercase tracking-widest transition-all", chartRange === r ? "bg-[var(--brand)] text-white shadow-lg shadow-[var(--brand-glow)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)]/50")}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-x-auto scrollbar-hide -mx-6 px-6">
            <div className="flex items-stretch justify-between gap-3 md:gap-4 h-[clamp(12.0rem,24.0vw,15.0rem)] pt-10 min-w-[clamp(30.0rem,60.0vw,37.5rem)] lg:min-w-0">
              {temporalVelocity.map((pt, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-4 group h-full">
                  <div className="relative w-full flex-1 flex items-end justify-center">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(pt.pct, 10)}%` }}
                      transition={{ duration: 1, ease: [0.19, 1, 0.22, 1], delay: i * 0.05 }}
                      className="w-full max-w-[2.5rem] rounded-t-xl bg-[var(--brand)] shadow-[0_0_20px_rgba(var(--brand-rgb),0.3)] group-hover:brightness-110 transition-all cursor-default relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.div>
                    {/* Tooltip */}
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-all bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] px-3 py-1.5 rounded-xl shadow-xl z-20 pointer-events-none">
                      <span className="text-[clamp(0.55rem,1.1vw,0.6875rem)] font-bold text-[var(--text-primary)]">{pt.count} Queries</span>
                    </div>
                  </div>
                  <span className="text-[clamp(0.45rem,0.9vw,0.5625rem)] font-bold tracking-tighter text-[var(--text-muted)] uppercase shrink-0">{pt.label}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Reliability Spectrum */}
        <motion.div
          variants={fadeUp} initial="initial" animate="animate"
          className="p-8 md:p-10 rounded-[2.5rem] bg-[var(--surface-1)]/95 backdrop-blur-xl border border-[var(--border-subtle)] shadow-lg hover:shadow-[0_24px_64px_-12px_rgba(0,0,0,0.1)] transition-all duration-500 flex flex-col ring-1 ring-white/10 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--brand-glow)] blur-[6.25rem] opacity-20 pointer-events-none" />
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[var(--warning-soft)] text-[var(--warning)]">
              <PieChart className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-[var(--text-primary)]">Reliability</h3>
              <p className="text-[clamp(0.5rem,1.0vw,0.625rem)] font-bold uppercase tracking-widest text-[var(--text-muted)]">Precision distribution</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center gap-6">
            {reliabilityStats.map((s, i) => (
              <div key={i} className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[clamp(0.55rem,1.1vw,0.6875rem)] font-bold text-[var(--text-primary)] tracking-wide">{s.label}</span>
                  <span className="text-[clamp(0.55rem,1.1vw,0.6875rem)] font-extrabold text-[var(--text-primary)]">{s.pct}%</span>
                </div>
                <div className="h-3 rounded-full bg-[var(--bg-secondary)] overflow-hidden border border-[var(--border-subtle)]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${s.pct}%` }}
                    transition={{ duration: 1.5, ease: [0.19, 1, 0.22, 1], delay: 0.2 + i * 0.1 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 pt-8 border-t border-[var(--border-subtle)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[clamp(0.45rem,0.9vw,0.5625rem)] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Global Average</p>
                <p className="text-3xl font-bold text-[var(--text-primary)]">{Math.round(avgConf)}%</p>
              </div>
              <div className="w-12 h-12 rounded-full border-4 border-[var(--brand)] animate-pulse shadow-[0_0_15px_var(--brand)] flex items-center justify-center">
                <Zap className="w-5 h-5 text-[var(--brand)]" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Critical Gaps Table ── */}
      <motion.div
        variants={fadeUp} initial="initial" animate="animate"
        className="rounded-[2.5rem] bg-[var(--surface-1)]/90 backdrop-blur-2xl border border-[var(--border-subtle)] shadow-[0_12px_48px_rgba(0,0,0,0.06)] overflow-hidden ring-1 ring-white/10"
      >
        <div className="p-8 md:p-10 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-secondary)]/30">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[var(--danger-soft)] text-[var(--danger)]">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-[var(--text-primary)]">Intelligence Gaps</h3>
              <p className="text-[clamp(0.5rem,1.0vw,0.625rem)] font-bold uppercase tracking-widest text-[var(--text-muted)]">Interactions with confidence threshold below 60%</p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={() => showToast("Deep anomaly audit coming in v3.1", "info" as any)}
            className="text-[clamp(0.5rem,1.0vw,0.625rem)] font-bold uppercase tracking-widest text-[var(--brand)] gap-2"
          >
            View Anomalies <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[var(--bg-secondary)]/50">
                <th className="px-6 md:px-10 py-5 text-[clamp(0.5rem,1.0vw,0.625rem)] font-bold uppercase tracking-widest text-[var(--text-muted)]">Interaction Trace</th>
                <th className="px-6 md:px-10 py-5 text-[clamp(0.5rem,1.0vw,0.625rem)] font-bold uppercase tracking-widest text-[var(--text-muted)]">Reliability</th>
                <th className="px-6 md:px-10 py-5 text-[clamp(0.5rem,1.0vw,0.625rem)] font-bold uppercase tracking-widest text-[var(--text-muted)] text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {queries.filter(q => q.confidence < 60).slice(0, 10).map((q, i) => (
                <tr key={i} className="group hover:bg-[var(--bg-secondary)] transition-all duration-300">
                  <td className="px-6 md:px-10 py-6 min-w-[15rem]">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] group-hover:bg-[var(--brand-soft)] group-hover:text-[var(--brand)] transition-all">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <span className="text-[clamp(0.7rem,1.4vw,0.875rem)] font-semibold text-[var(--text-primary)] line-clamp-1">{q.question || "Encrypted system trace"}</span>
                    </div>
                  </td>
                  <td className="px-6 md:px-10 py-6">
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-1 rounded-full bg-[var(--danger-soft)] border border-[var(--danger-ring)] text-[var(--danger)] text-[clamp(0.5rem,1.0vw,0.625rem)] font-bold">
                        {Math.round(q.confidence)}% Precision
                      </div>
                    </div>
                  </td>
                  <td className="px-6 md:px-10 py-6 text-right">
                    <span className="text-[clamp(0.6rem,1.2vw,0.75rem)] font-bold text-[var(--text-muted)] uppercase tracking-tighter">
                      {new Date(q.date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>
                </tr>
              ))}
              {queries.filter(q => q.confidence < 60).length === 0 && (
                <tr>
                  <td colSpan={3} className="px-10 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-30">
                      <ShieldCheck className="w-12 h-12" />
                      <p className="text-[clamp(0.55rem,1.1vw,0.6875rem)] font-bold uppercase tracking-widest">No intelligence gaps detected in system</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

    </div>
  );
}
