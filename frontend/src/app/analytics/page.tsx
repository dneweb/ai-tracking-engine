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
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import CountUp from "react-countup";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

/* ─── Motion Variants ───────────────────────────────────── */
const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.19, 1, 0.22, 1] } },
};

const stagger = {
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
      className="group relative p-6 rounded-[32px] bg-[var(--card-bg)] border border-[var(--border-subtle)] shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-lg)] hover:border-[var(--brand)] transition-all duration-500"
    >
      <div className="flex justify-between items-start mb-6">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-[var(--bg-secondary)] text-[var(--text-muted)] group-hover:bg-[var(--brand-soft)] group-hover:text-[var(--brand)] transition-all duration-500">
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-tight",
            trend.positive ? "bg-[var(--success-soft)] text-[var(--success)]" : "bg-[var(--danger-soft)] text-[var(--danger)]"
          )}>
            {trend.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trend.value}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold tracking-tight text-[var(--text-primary)]" style={{ fontFamily: "var(--font-display)" }}>
            <CountUp end={value} duration={2} decimals={unit === "%" ? 0 : 0} />
          </span>
          <span className="text-lg font-bold text-[var(--text-muted)]">{unit}</span>
        </div>
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors">
          {label}
        </p>
      </div>

      <div className="absolute bottom-0 left-8 right-8 h-1 bg-[var(--brand)] opacity-0 group-hover:opacity-100 group-hover:h-1.5 rounded-t-full transition-all duration-500" style={{ backgroundColor: accent }} />
    </motion.div>
  );
}

/* ─── Page Component ─────────────────────────────────── */
export default function AnalyticsPage() {
  const { getToken } = useAuth();
  const { showToast } = useToast();
  const { isAdmin, isLoaded: roleLoaded } = useRole();
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
        if (token) {
          const [qData, dData, sData] = await Promise.all([
            getQueries(undefined, token),
            getDocuments(token),
            getAnalyticsStats(30, token),
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
  }, [getToken]);

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
    if (queries.length === 0) return { temporalVelocity: [] };
    const now = Date.now();
    let windowMs = (chartRange === "7d" ? 7 : 30) * 864e5;
    const buckets = chartRange === "7d" ? 7 : 10;
    const bucketMs = windowMs / buckets;
    const buf = Array.from({ length: buckets }, () => ({ count: 0, label: "" }));

    for (let i = 0; i < buckets; i++) {
        const d = new Date(now - i * bucketMs);
        buf[buckets - 1 - i].label = d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" }).toUpperCase();
    }

    queries.forEach((q) => {
        const diff = now - new Date(q.date).getTime();
        if (diff <= windowMs) {
            let idx = buckets - 1 - Math.floor(diff / bucketMs);
            idx = Math.max(0, Math.min(buckets - 1, idx));
            buf[idx].count++;
        }
    });

    const max = Math.max(1, ...buf.map(b => b.count));
    return { temporalVelocity: buf.map(b => ({ label: b.label, count: b.count, pct: (b.count / max) * 100 })) };
  }, [queries, chartRange]);

  const reliabilityStats = useMemo(() => {
    const high = queries.filter(q => q.confidence >= 80).length;
    const med = queries.filter(q => q.confidence >= 60 && q.confidence < 80).length;
    const low = queries.filter(q => q.confidence < 60).length;
    const total = queries.length || 1;
    return [
      { label: "High Precision", value: high, pct: Math.round((high/total)*100), color: "var(--success)" },
      { label: "Marginal Sync", value: med, pct: Math.round((med/total)*100), color: "var(--warning)" },
      { label: "Critical Gaps", value: low, pct: Math.round((low/total)*100), color: "var(--danger)" },
    ];
  }, [queries]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-[var(--brand-soft)] border-t-[var(--brand)] rounded-full animate-spin" />
          <div className="absolute inset-0 bg-[var(--brand)] blur-2xl opacity-20 animate-pulse" />
        </div>
        <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-[var(--text-muted)] animate-pulse">
          Synthesizing Neural Metrics
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-12 md:py-20 space-y-12">
      
      {/* ── Header ── */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <motion.div variants={fadeUp} initial="initial" animate="animate">
          <h1 className="text-[clamp(2.5rem,8vw,4rem)] font-bold tracking-tight text-[var(--text-primary)]" style={{ fontFamily: "var(--font-display)" }}>
            Intelligence <span className="text-[var(--brand)]">Insights.</span>
          </h1>
          <p className="text-[13px] font-semibold text-[var(--text-muted)] tracking-widest uppercase mt-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-[var(--brand)]" />
            Live temporal metrics · System efficiency audit 
          </p>
        </motion.div>

        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => showToast("Metric manifest preparation active...", "success")}
            className="rounded-2xl px-6 py-6 h-auto font-bold uppercase tracking-widest text-[10px] gap-2"
          >
            <Download className="w-4 h-4" /> Export Synthesis
          </Button>
        </div>
      </div>

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
            className="lg:col-span-2 p-8 md:p-10 rounded-[40px] bg-[var(--card-bg)] border border-[var(--border-subtle)] shadow-[var(--card-shadow)] flex flex-col"
        >
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[var(--brand-soft)] text-[var(--brand)]">
                 <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: "var(--font-display)" }}>Temporal Velocity</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Interaction frequency over time</p>
              </div>
            </div>
            <div className="flex p-1 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                {(["7d", "30d", "all"] as const).map(r => (
                    <button 
                        key={r} onClick={() => setChartRange(r)}
                        className={cn("px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all", chartRange === r ? "bg-[var(--brand)] text-white shadow-md" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]")}
                    >
                        {r}
                    </button>
                ))}
            </div>
          </div>

          <div className="flex-1 flex items-end justify-between gap-4 h-[240px] pt-10">
            {temporalVelocity.map((pt, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                <div className="relative w-full flex items-end justify-center h-full">
                   <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(pt.pct, 4)}%` }}
                        transition={{ duration: 1, ease: [0.19, 1, 0.22, 1], delay: i * 0.05 }}
                        className="w-full max-w-[40px] rounded-2xl bg-[var(--brand-soft)] border-t-2 border-[var(--brand)] group-hover:scale-x-110 group-hover:brightness-110 transition-all cursor-default relative overflow-hidden"
                   >
                     <div className="absolute inset-0 bg-gradient-to-t from-transparent via-[var(--brand)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                   </motion.div>
                   {/* Tooltip */}
                   <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-all bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] px-3 py-1.5 rounded-xl shadow-xl z-20 pointer-events-none">
                     <span className="text-[11px] font-bold text-[var(--text-primary)]">{pt.count} Queries</span>
                   </div>
                </div>
                <span className="text-[9px] font-bold tracking-tighter text-[var(--text-muted)] uppercase rotate-45 sm:rotate-0">{pt.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Reliability Spectrum */}
        <motion.div 
            variants={fadeUp} initial="initial" animate="animate"
            className="p-8 md:p-10 rounded-[40px] bg-[var(--card-bg)] border border-[var(--border-subtle)] shadow-[var(--card-shadow)] flex flex-col"
        >
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[var(--warning-soft)] text-[var(--warning)]">
               <PieChart className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: "var(--font-display)" }}>Reliability</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Precision distribution</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center gap-6">
            {reliabilityStats.map((s, i) => (
               <div key={i} className="space-y-3">
                  <div className="flex items-center justify-between">
                     <span className="text-[11px] font-bold text-[var(--text-primary)] tracking-wide">{s.label}</span>
                     <span className="text-[11px] font-extrabold text-[var(--text-primary)]">{s.pct}%</span>
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
                   <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Global Average</p>
                   <p className="text-3xl font-bold text-[var(--text-primary)]" style={{ fontFamily: "var(--font-display)" }}>{Math.round(avgConf)}%</p>
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
        className="rounded-[40px] bg-[var(--card-bg)] border border-[var(--border-subtle)] shadow-[var(--card-shadow)] overflow-hidden"
      >
        <div className="p-8 md:p-10 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-secondary)]/30">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[var(--danger-soft)] text-[var(--danger)]">
               <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: "var(--font-display)" }}>Intelligence Gaps</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Interactions with confidence threshold below 60%</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            onClick={() => showToast("Deep anomaly audit coming in v3.1", "info" as any)}
            className="text-[10px] font-bold uppercase tracking-widest text-[var(--brand)] gap-2"
          >
            View Anomalies <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[var(--bg-secondary)]/50">
                <th className="px-10 py-5 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Interaction Trace</th>
                <th className="px-10 py-5 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Reliability</th>
                <th className="px-10 py-5 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {queries.filter(q => q.confidence < 60).slice(0, 10).map((q, i) => (
                <tr key={i} className="group hover:bg-[var(--bg-secondary)] transition-all duration-300">
                  <td className="px-10 py-6 min-w-[300px]">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] group-hover:bg-[var(--brand-soft)] group-hover:text-[var(--brand)] transition-all">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <span className="text-[14px] font-semibold text-[var(--text-primary)] line-clamp-1">{q.question || "Encrypted system trace"}</span>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-3">
                       <div className="px-3 py-1 rounded-full bg-[var(--danger-soft)] border border-[var(--danger-ring)] text-[var(--danger)] text-[10px] font-bold">
                         {Math.round(q.confidence)}% Precision
                       </div>
                    </div>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <span className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">
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
                         <p className="text-[11px] font-bold uppercase tracking-widest">No intelligence gaps detected in system</p>
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
