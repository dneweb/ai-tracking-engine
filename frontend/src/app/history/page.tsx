"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Search, Download, Activity, Zap, Shield,
  BarChart3, ChevronDown, ChevronRight,
  MessageSquare, Trash2, Brain, User, Clock,
} from "lucide-react";
import { useUser, useAuth } from "@clerk/nextjs";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { useToast } from "@/context/ToastContext";
import { motion, AnimatePresence, Variants } from "framer-motion";
import CountUp from "react-countup";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useConversations, Conversation, ConversationMessage } from "@/hooks/useConversations";

/* ─── Motion Variants ─────────────────────────────────── */
const fadeUp: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0, 0, 0.2, 1] } },
};
const stagger: Variants = {
  animate: { transition: { staggerChildren: 0.04 } },
};

/* ─── Stat Card ─────────────────────────────────────────── */
function StatCard({ label, value, unit, icon: Icon, sub, index }: {
  label: string; value: number | string; unit: string;
  icon: React.ElementType; sub: string; index: number;
}) {
  return (
    <motion.div
      variants={fadeUp}
      className="group relative p-8 rounded-[2.5rem] glass-strong border border-[var(--border-subtle)] shadow-xl hover:shadow-[0_24px_64px_rgba(0,0,0,0.15)] hover:border-[var(--brand)] transition-all duration-700 overflow-hidden ring-1 ring-white/10"
    >
      <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-[var(--brand-glow)] to-transparent blur-[5.0rem] opacity-0 group-hover:opacity-40 transition-opacity duration-1000 pointer-events-none" />
      <div className="flex justify-between items-start mb-10 relative z-10">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-muted)] group-hover:bg-[var(--brand)] group-hover:text-white group-hover:shadow-[0_12px_32px_rgba(var(--brand-rgb),0.4)] transition-all duration-700 group-hover:rotate-6">
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div className="space-y-3 relative z-10">
        <div className="flex items-baseline gap-2">
          <span className="text-[clamp(2.5rem,5vw,3rem)] font-bold tracking-tight text-[var(--text-primary)]">
            {typeof value === "number" ? <CountUp end={value} duration={2} /> : value}
          </span>
          <span className="text-[clamp(1rem,2vw,1.25rem)] font-bold text-[var(--text-muted)] opacity-60">{unit}</span>
        </div>
        <div>
          <p className="text-[clamp(0.55rem,1.1vw,0.6875rem)] font-bold tracking-[0.3em] uppercase text-[var(--text-muted)] group-hover:text-[var(--brand)] transition-all duration-500">{label}</p>
          <p className="text-[clamp(0.45rem,0.9vw,0.5625rem)] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1 opacity-50">{sub}</p>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Message bubble ─────────────────────────────────────── */
function MessageBubble({ role, content, confidence, timestamp }: {
  role: "user" | "assistant"; content: string; confidence?: number; timestamp?: string;
}) {
  const pct = confidence !== undefined
    ? (confidence < 1 ? Math.round(confidence * 100) : Math.round(confidence))
    : null;
  return (
    <div className={cn("flex gap-3", role === "user" ? "flex-row-reverse ml-auto max-w-[85%]" : "mr-auto max-w-[90%]")}>
      <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-1"
        style={{
          background: role === "user" ? "var(--brand)" : "var(--surface-2)",
          border: "1px solid var(--border-subtle)",
          color: role === "user" ? "white" : "var(--text-secondary)",
        }}>
        {role === "user" ? <User className="w-3.5 h-3.5" /> : <Brain className="w-3.5 h-3.5" style={{ color: "var(--brand)" }} />}
      </div>
      <div className="flex flex-col gap-1">
        <div className="px-4 py-3 rounded-2xl text-sm leading-relaxed"
          style={{
            background: role === "user" ? "var(--brand)" : "var(--surface-2)",
            color: role === "user" ? "white" : "var(--text-primary)",
            border: role === "assistant" ? "1px solid var(--border-subtle)" : "none",
            borderRadius: role === "user" ? "1.25rem 1.25rem 0.25rem 1.25rem" : "0.25rem 1.25rem 1.25rem 1.25rem",
            whiteSpace: "pre-wrap", wordBreak: "break-word",
          }}>
          {content}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {pct !== null && (
            <span className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.5rem] font-bold border",
              pct >= 80 ? "bg-[var(--success-soft)] text-[var(--success)] border-[var(--success-ring)]"
                : pct >= 60 ? "bg-[var(--warning-soft)] text-[var(--warning)] border-[var(--warning-ring)]"
                : "bg-[var(--danger-soft)] text-[var(--danger)] border-[var(--danger-ring)]"
            )}>
              <Shield className="w-2.5 h-2.5" />{pct}% confidence
            </span>
          )}
          {timestamp && (
            <span className="text-[0.5rem] font-bold text-[var(--text-muted)] uppercase tracking-widest opacity-50">
              {new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Conversation Row ───────────────────────────────────── */
function ConversationRow({
  conv, index, total, onDelete,
}: {
  conv: Conversation; index: number; total: number; onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const { getToken } = useAuth();
  const { member } = useCurrentMember();
  const API_BASE = "/backend-api"; // Always proxy through Next.js → Render /api/:path*

  const loadMessages = useCallback(async () => {
    if (messages.length > 0) return;
    setLoadingMsgs(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/conversations/${conv.conversation_id}/messages`, {
        headers: { Authorization: `Bearer ${token}`, "X-Org-ID": member?.org_id ?? "" },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages ?? []);
      }
    } catch { /* silent */ }
    finally { setLoadingMsgs(false); }
  }, [conv.conversation_id, getToken, member, messages.length, API_BASE]);

  const handleToggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) loadMessages();
  };

  const handleExport = () => {
    const exportData = {
      conversation_id: conv.conversation_id,
      title: conv.title,
      created_at: conv.created_at,
      messages: messages.flatMap((m) => [
        { role: "user", content: m.question, timestamp: m.created_at },
        { role: "assistant", content: m.answer, confidence: m.confidence_score, timestamp: m.created_at },
      ]),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conversation-${conv.conversation_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div variants={fadeUp} className="group relative">
      <div className={cn(
        "rounded-[2.25rem] glass-strong border shadow-lg transition-all duration-500 overflow-hidden ring-1 ring-white/5",
        expanded ? "border-[var(--brand)] shadow-[0_24px_64px_rgba(0,0,0,0.15)]" : "border-[var(--border-subtle)] hover:border-[var(--brand)]"
      )}>
        {/* Header row */}
        <div className="flex items-center gap-5 p-6 md:p-8 cursor-pointer" onClick={handleToggle}>
          {/* Index */}
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[0.6rem] font-bold text-[var(--text-muted)] group-hover:bg-[var(--brand)] group-hover:text-white transition-all duration-500 flex-shrink-0">
            {String(total - index).padStart(3, "0")}
          </div>
          <div className="w-12 h-12 rounded-[1.5rem] flex items-center justify-center bg-[var(--bg-primary)] border border-[var(--border-subtle)] flex-shrink-0">
            <MessageSquare className="w-5 h-5 text-[var(--text-secondary)] group-hover:text-[var(--brand)] transition-colors" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-base md:text-lg font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--brand)] transition-colors duration-300">
              {conv.title}
            </h3>
            <div className="flex flex-wrap items-center gap-3 mt-1">
              <span className="text-[0.6rem] font-bold text-[var(--text-muted)] uppercase tracking-widest opacity-60 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(conv.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </span>
              <span className="px-2 py-0.5 rounded-lg text-[0.5625rem] font-bold bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                {conv.message_count} {conv.message_count === 1 ? "message" : "messages"}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {messages.length > 0 && (
              <button onClick={(e) => { e.stopPropagation(); handleExport(); }}
                className="p-2.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--brand)] hover:bg-[var(--brand-soft)] transition-all"
                title="Export conversation">
                <Download className="w-4 h-4" />
              </button>
            )}
            {!confirmed ? (
              <button onClick={(e) => { e.stopPropagation(); setConfirmed(true); }}
                className="p-2.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-all opacity-0 group-hover:opacity-100"
                title="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex gap-1">
                <button onClick={(e) => { e.stopPropagation(); onDelete(conv.conversation_id); }}
                  className="px-2.5 py-1 rounded-lg text-[0.5625rem] font-bold bg-[var(--danger)] text-white">
                  Delete
                </button>
                <button onClick={(e) => { e.stopPropagation(); setConfirmed(false); }}
                  className="px-2.5 py-1 rounded-lg text-[0.5625rem] font-bold bg-[var(--surface-2)] text-[var(--text-muted)]">
                  Cancel
                </button>
              </div>
            )}
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[var(--surface-2)] text-[var(--text-muted)] transition-transform duration-300" style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Expanded thread */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="border-t border-[var(--border-subtle)] px-6 md:px-8 py-6 space-y-4"
                style={{ background: "var(--bg-secondary)" }}>
                {loadingMsgs ? (
                  <div className="flex items-center justify-center py-8 gap-3">
                    <div className="w-5 h-5 border-2 border-[var(--brand-soft)] border-t-[var(--brand)] rounded-full animate-spin" />
                    <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest animate-pulse">Loading thread...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-center text-xs text-[var(--text-muted)] py-6 uppercase tracking-widest">No messages found</p>
                ) : (
                  messages.map((m, i) => (
                    <div key={i} className="space-y-3">
                      <MessageBubble role="user" content={m.question} timestamp={m.created_at} />
                      <MessageBubble role="assistant" content={m.answer} confidence={m.confidence_score} timestamp={m.created_at} />
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ─── Page ──────────────────────────────────────────────── */
export default function HistoryPage() {
  const { isLoaded, isSignedIn } = useUser();
  const { member } = useCurrentMember();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  const {
    conversations,
    isLoading,
    deleteConversation,
    fetchConversations,
  } = useConversations();

  const filteredConversations = useMemo(
    () => conversations.filter((c) => c.title.toLowerCase().includes(searchTerm.toLowerCase())),
    [conversations, searchTerm]
  );

  const stats = useMemo(() => {
    const total = conversations.length;
    const totalMsgs = conversations.reduce((a, c) => a + c.message_count, 0);
    const today = new Date().toDateString();
    const todayCount = conversations.filter((c) => new Date(c.updated_at).toDateString() === today).length;
    return [
      { label: "Conversations", value: total, unit: "", icon: MessageSquare, sub: "Total threads" },
      { label: "Total Messages", value: totalMsgs, unit: "", icon: Activity, sub: "All exchanges" },
      { label: "Today Active", value: todayCount, unit: "", icon: Zap, sub: "Threads today" },
      { label: "Avg Length", value: total > 0 ? Math.round(totalMsgs / total) : 0, unit: "", icon: BarChart3, sub: "Msgs per conv" },
    ];
  }, [conversations]);

  if (isLoading && conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="w-16 h-16 border-4 border-[var(--brand-soft)] border-t-[var(--brand)] rounded-full animate-spin" />
        <p className="text-[clamp(0.55rem,1.1vw,0.6875rem)] font-bold tracking-[0.3em] uppercase text-[var(--text-muted)] animate-pulse">
          {isLoaded && isSignedIn && !member ? "No organisation found" : "Accessing Neural Archives"}
        </p>
      </div>
    );
  }

  return (
    <div className="container-app py-8 md:py-20 space-y-8 md:space-y-12">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 15, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between mb-8 md:mb-16"
      >
        <div className="space-y-4 sm:space-y-5">
          <h1 className="text-[clamp(2.5rem,8vw,5.5rem)] md:text-[clamp(3.5rem,10vw,6rem)] font-bold tracking-tight text-[var(--text-primary)] leading-[0.9] sm:leading-[0.85]" style={{ fontFamily: "var(--font-display)" }}>
            Neural <span className="brand-gradient-text">Archives.</span>
          </h1>
          <div className="flex items-center gap-4">
            <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[var(--brand)] animate-glow-pulse shadow-[0_0_12px_var(--brand)]" />
            <p className="text-[clamp(0.55rem,1.1vw,0.75rem)] font-bold text-[var(--text-muted)] tracking-[0.2em] sm:tracking-[0.3em] uppercase">
              Conversation threads · {filteredConversations.length} records
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full lg:w-auto">
          <Button
            variant="outline"
            onClick={() => showToast("JSON Manifest preparation active...", "success")}
            className="rounded-2xl px-10 min-h-[3.75rem] font-bold uppercase tracking-[0.2em] text-[clamp(0.55rem,1.1vw,0.6875rem)] gap-3 glass-strong border-[var(--border-subtle)] hover:border-[var(--brand)] transition-all w-full lg:w-auto"
          >
            <Download className="w-5 h-5" /> Export JSON Log
          </Button>
        </div>
      </motion.div>

      {/* ── Stats ── */}
      <motion.div variants={stagger} initial="initial" animate="animate" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s, i) => <StatCard key={i} {...s} index={i} />)}
      </motion.div>

      {/* ── Search bar ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className="sticky top-[var(--topbar-height)] z-20 py-6 -mx-4 md:-mx-8 lg:-mx-12 px-4 md:px-8 lg:px-12 bg-[var(--bg-primary)]/80 backdrop-blur-xl border-b border-[var(--border-subtle)]">
        <div className="w-full">
          <div className="group relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within:text-[var(--brand)] transition-colors" />
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-[clamp(0.75rem,1.5vw,0.9375rem)] font-medium bg-[var(--surface-1)]/80 backdrop-blur-md border border-[var(--border-default)] shadow-sm focus:border-[var(--brand)] focus:shadow-[0_0_0_4px_var(--brand-soft)] transition-all outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </motion.div>

      {/* ── Conversation list ── */}
      <div className="space-y-4">
        <AnimatePresence mode="wait">
          {filteredConversations.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="py-32 flex flex-col items-center text-center gap-6 rounded-[2.5rem] border-2 border-dashed border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30"
            >
              <div className="w-20 h-20 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] opacity-30">
                <Search className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: "var(--font-display)" }}>Void Archives</h3>
                <p className="text-[clamp(0.7rem,1.4vw,0.875rem)] text-[var(--text-muted)] font-medium max-w-xs uppercase tracking-widest">
                  {searchTerm ? "No conversations match your search" : "No conversations yet — start asking questions"}
                </p>
              </div>
              {searchTerm && (
                <Button variant="outline" onClick={() => setSearchTerm("")} className="rounded-xl px-10">Clear Search</Button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              variants={stagger}
              initial="initial"
              animate="animate"
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              className="space-y-4"
            >
              {filteredConversations.map((conv, idx) => (
                <ConversationRow
                  key={conv.conversation_id}
                  conv={conv}
                  index={idx}
                  total={filteredConversations.length}
                  onDelete={deleteConversation}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!isLoading && filteredConversations.length > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-[clamp(0.5rem,1.0vw,0.625rem)] font-bold uppercase tracking-[0.3em] text-[var(--text-muted)] opacity-40 pt-8"
        >
          End of transmission · {filteredConversations.length} records retrieved
        </motion.p>
      )}
    </div>
  );
}
