"use client";

import { useEffect, useState, useMemo } from "react";
import { getQueries, Query } from "@/lib/api";
import {
  Search, Download, Activity, Zap, Shield,
  BarChart3, ArrowUpRight, Filter, SlidersHorizontal,
  Clock, MessageSquare, ChevronRight, Hash
} from "lucide-react";
import { useUser, useAuth } from "@clerk/nextjs";
import { useToast } from "@/context/ToastContext";
import { motion, AnimatePresence } from "framer-motion";
import CountUp from "react-countup";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/* ─── Motion Variants ─────────────────────────────────── */
const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.19, 1, 0.22, 1] } },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.05 } },
};

/* ─── Stat Card ────────────────────────────────────────── */
function StatCard({
  label, value, unit, icon: Icon, color, sub, index,
}: {
  label: string; value: number | string; unit: string;
  icon: React.ElementType; color: string; sub: string; index: number;
}) {
  return (
    <motion.div
      variants={fadeUp}
      className="group relative p-6 rounded-[32px] bg-[var(--card-bg)] border border-[var(--border-subtle)] shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-lg)] hover:border-[var(--brand)] transition-all duration-500 overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--brand-glow)] blur-[40px] opacity-0 group-hover:opacity-30 transition-opacity" style={{ backgroundColor: color }} />
      
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--bg-secondary)] text-[var(--text-muted)] group-hover:bg-[var(--brand-soft)] group-hover:text-[var(--brand)] transition-all duration-500">
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="space-y-1 relative z-10">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)]" style={{ fontFamily: "var(--font-body)" }}>
            {typeof value === "number" ? <CountUp end={value} duration={1.5} /> : value}
          </span>
          <span className="text-lg font-bold text-[var(--text-muted)]">{unit}</span>
        </div>
        <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors">
          {label}
        </p>
      </div>
    </motion.div>
  );
}

/* ─── Query row ────────────────────────────────────────── */
function QueryRow({ query: q, index, total }: { query: Query; index: number; total: number }) {
  const reliability = Math.round(q.confidence < 1 ? q.confidence * 100 : q.confidence);
  
  return (
    <motion.div
      variants={fadeUp}
      className="group relative"
    >
      <div className="p-6 rounded-[28px] bg-[var(--card-bg)] border border-[var(--border-subtle)] shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-lg)] hover:border-[var(--brand)] transition-all duration-500 flex flex-col sm:flex-row items-center gap-6">
        
        {/* Index & Icon */}
        <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[10px] font-bold tabular-nums text-[var(--text-muted)] group-hover:bg-[var(--brand-soft)] group-hover:text-[var(--brand)] transition-all">
               {String(total - index).padStart(3, '0')}
            </div>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[var(--bg-primary)] border border-[var(--border-subtle)] group-hover:scale-110 transition-transform duration-500">
               <MessageSquare className="w-5 h-5 text-[var(--text-secondary)] group-hover:text-[var(--brand)] transition-colors" />
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 w-full">
           <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge domain={q.category} className="px-3 py-1 text-[9px] font-bold uppercase tracking-widest">{q.category}</Badge>
              <div className={cn(
                "px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5",
                reliability >= 80 ? "bg-[var(--success-soft)] text-[var(--success)]" : reliability >= 60 ? "bg-[var(--warning-soft)] text-[var(--warning)]" : "bg-[var(--danger-soft)] text-[var(--danger)]"
              )}>
                <Shield className="w-3 h-3" />
                {reliability}% Match
              </div>
           </div>
           <h3 className="text-[15px] font-semibold text-[var(--text-primary)] leading-relaxed truncate group-hover:text-[var(--brand)] transition-colors duration-500">
              {q.question}
           </h3>
        </div>

        {/* Meta & Actions */}
        <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto sm:pl-6 sm:border-l border-[var(--border-subtle)]">
           <div className="text-left sm:text-right">
              <p className="text-[11px] font-bold text-[var(--text-primary)] tracking-tight">
                 {new Date(q.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-0.5">
                 {new Date(q.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
           </div>
           <button 
             onClick={() => showToast("Neural trail visualization coming in v3.1", "info" as any)}
             className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] hover:bg-[var(--brand)] hover:text-white transition-all active:scale-90 group/btn"
           >
              <ArrowUpRight className="w-4 h-4 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
           </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Page ─────────────────────────────────────────────── */
export default function HistoryPage() {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const { getToken } = useAuth();
  const { showToast } = useToast();

  const [queries, setQueries] = useState<Query[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    async function loadData() {
      try {
        const token = await getToken();
        const userEmail = clerkUser?.emailAddresses[0]?.emailAddress;
        const data = await getQueries(
          clerkUser?.publicMetadata?.role === "admin" ? undefined : userEmail,
          token || undefined
        );
        setQueries(data);
      } catch (err) {
        console.error("Failed to load queries", err);
      } finally {
        setLoading(false);
      }
    }
    if (isLoaded && isSignedIn) loadData();
  }, [clerkUser, isLoaded, isSignedIn, getToken]);

  const stats = useMemo(() => {
    const total = queries.length;
    const avgConf = total > 0 ? queries.reduce((a, q) => a + q.confidence, 0) / total : 0;
    const today = new Date().toDateString();
    const velocity = queries.filter((q) => new Date(q.date).toDateString() === today).length;
    const counts = queries.reduce((acc, q) => {
      acc[q.category] = (acc[q.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topCat = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
    
    return [
      { label: "Neural Logs", value: total, unit: "", icon: Activity, color: "var(--brand)", sub: "Total interactions" },
      { label: "Reliability", value: Math.round(avgConf < 1 ? avgConf * 100 : avgConf), unit: "%", icon: Shield, color: "var(--success)", sub: "Mean confidence" },
      { label: "Active Sector", value: topCat, unit: "", icon: Zap, color: "var(--warning)", sub: "Top domain" },
      { label: "24h Velocity", value: velocity, unit: "", icon: BarChart3, color: "var(--info)", sub: "Queries today" },
    ];
  }, [queries]);

  const filteredQueries = useMemo(() => {
    let f = queries.filter(
      (q) =>
        q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (activeFilter === "high") f = f.filter((q) => q.confidence >= 80);
    return f;
  }, [queries, searchTerm, activeFilter]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="w-16 h-16 border-4 border-[var(--brand-soft)] border-t-[var(--brand)] rounded-full animate-spin" />
        <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-[var(--text-muted)] animate-pulse">
          Accessing Neural Archives
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-12 md:py-20 space-y-12">

      {/* ── Header ── */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <motion.div variants={fadeUp} initial="initial" animate="animate">
          <h1 className="text-[clamp(2.5rem,8vw,4.5rem)] font-extrabold tracking-tight text-[var(--text-primary)]" style={{ fontFamily: "var(--font-body)" }}>
            Neural <span className="text-[var(--brand)]">Archives.</span>
          </h1>
          <p className="text-[13px] font-semibold text-[var(--text-muted)] tracking-widest uppercase mt-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[var(--brand)]" />
            Traversed network logs · {queries.length} historical trails
          </p>
        </motion.div>

        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => showToast("JSON Manifest preparation active...", "success")}
            className="rounded-2xl px-6 py-6 h-auto font-bold uppercase tracking-widest text-[10px] gap-2"
          >
            <Download className="w-4 h-4" /> Export JSON Log
          </Button>
        </div>
      </div>

      {/* ── Stats grid ── */}
      <motion.div variants={stagger} initial="initial" animate="animate" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <StatCard key={i} {...s} index={i} />
        ))}
      </motion.div>

      {/* ── Filter Bar ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="sticky top-[var(--topbar-height)] z-20 py-6 -mx-6 px-6 bg-[var(--bg-primary)]/80 backdrop-blur-xl border-b border-[var(--border-subtle)]"
      >
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
           <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide w-full md:w-auto">
              {[
                { id: "all", label: "All Logs" },
                { id: "high", label: "High Precision" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className={cn(
                    "whitespace-nowrap px-6 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all",
                    activeFilter === f.id
                      ? "bg-[var(--brand)] text-white shadow-md shadow-[var(--brand-soft)]"
                      : "bg-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                  )}
                >
                  {f.label}
                </button>
              ))}
              <div className="w-px h-6 bg-[var(--border-subtle)] mx-2 hidden sm:block" />
              <button className="whitespace-nowrap flex items-center gap-2 px-6 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] transition-all">
                 <SlidersHorizontal className="w-3.5 h-3.5" /> Domain Filter
              </button>
           </div>

           <div className="group relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within:text-[var(--brand)] transition-colors" />
              <input
                type="text"
                placeholder="Scan archives..."
                className="w-full pl-11 pr-4 py-3 rounded-2xl text-sm font-medium bg-[var(--input-bg)] border border-[var(--border-subtle)] focus:border-[var(--brand)] transition-all outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
        </div>
      </motion.div>

      {/* ── Query List ── */}
      <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-4">
        <AnimatePresence mode="wait">
          {filteredQueries.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="py-32 flex flex-col items-center text-center gap-6 rounded-[40px] border-2 border-dashed border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30"
            >
               <div className="w-20 h-20 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] opacity-30">
                 <Search className="w-10 h-10" />
               </div>
               <div className="space-y-2">
                 <h3 className="text-2xl font-extrabold text-[var(--text-primary)]" style={{ fontFamily: "var(--font-body)" }}>Void Archives</h3>
                 <p className="text-[14px] text-[var(--text-muted)] font-medium max-w-xs uppercase tracking-widest">No intelligence logs match your traversal parameters</p>
               </div>
               <Button variant="outline" onClick={() => { setActiveFilter("all"); setSearchTerm(""); }} className="rounded-xl px-10">Clear Parameters</Button>
            </motion.div>
          ) : (
            <motion.div key="list">
              {filteredQueries.map((q, idx) => (
                <QueryRow
                  key={q.id}
                  query={q}
                  index={idx}
                  total={filteredQueries.length}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {!loading && filteredQueries.length > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--text-muted)] opacity-40 pt-8"
        >
          End of transmission · {filteredQueries.length} records retrieved
        </motion.p>
      )}
    </div>
  );
}
