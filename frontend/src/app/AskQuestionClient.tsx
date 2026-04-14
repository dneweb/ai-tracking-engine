"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  Search, Loader2, ArrowRight, Sparkles, Brain,
  Shield, Activity, TrendingUp, Paperclip, Zap,
  ChevronRight, X, Clock, Navigation, CheckCircle2,
  FileText, Command, CornerDownLeft, Eye, MessageSquare
} from "lucide-react";
import { askQuestion, QuestionResponse } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

/* ─── Constants ────────────────────────────────────────── */
const PROMPT_CARDS = [
  {
    icon: Clock,
    title: "PTO & Leave Policy",
    query: "How do I request time off and what is our PTO policy?",
    outcome: "Analyzes 3 HR documents",
    color: "var(--info)",
    bg: "var(--info-soft)"
  },
  {
    icon: Zap,
    title: "IT Support Protocol",
    query: "What is the correct procedure for submitting a high-priority IT ticket?",
    outcome: "Cross-references IT protocol",
    color: "var(--warning)",
    bg: "var(--warning-soft)"
  },
  {
    icon: FileText,
    title: "Expense Guidelines",
    query: "What is the expense policy for travel and hardware?",
    outcome: "Extracts financial terms",
    color: "var(--success)",
    bg: "var(--success-soft)"
  },
  {
    icon: TrendingUp,
    title: "Performance Reviews",
    query: "How are performance reviews conducted and what is the schedule?",
    outcome: "Synthesizes HR schedule",
    color: "var(--brand)",
    bg: "var(--brand-soft)"
  }
];

const REASONING_STEPS = [
  "Initializing neural connection...",
  "Parsing query intent & entity recognition...",
  "Querying vector database for semantic matches...",
  "Cross-referencing organizational policies...",
  "Synthesizing response...",
];

/* ─── Page component ───────────────────────────────────── */
export default function AskQuestionPage() {
  const { user, isLoaded: userLoaded } = useUser();
  const { getToken, isLoaded: authLoaded, userId } = useAuth();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<QuestionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [reasoningStep, setReasoningStep] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Time-based greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const firstName = user?.firstName || user?.username || "Colleague";

  // Auth Redirect Effect (Must run after hooks are defined to avoid setState in render errors)
  useEffect(() => {
    if (authLoaded && userLoaded && !userId) {
      router.replace('/sign-in');
    }
  }, [authLoaded, userLoaded, userId, router]);

  // Keyboard shortcut listener
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // ── Auth Guard ──────────────────────────────────────────────────────────
  // Show a full-screen spinner while Clerk is initialising.
  // This is the key fix: we never render ANY page content until we have
  // confirmed the user IS authenticated. No redirect flash possible.
  if (!authLoaded || !userLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--brand)]" />
          <p className="text-sm text-[var(--text-muted)] font-medium">Verifying credentials...</p>
        </div>
      </div>
    );
  }

  // Clerk is loaded but user is NOT authenticated — show spinner while redirect fires
  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--brand)]" />
          <p className="text-sm text-[var(--text-muted)] font-medium">Redirecting...</p>
        </div>
      </div>
    );
  }
  // ── End Auth Guard ────────────────────────────────────────────────────────

  const simulateReasoning = () => {
    setReasoningStep(0);
    const interval = setInterval(() => {
      setReasoningStep(prev => {
        if (prev >= REASONING_STEPS.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 600);
    return interval;
  };

  const handleAsk = async (e?: React.FormEvent, questionText: string = query) => {
    e?.preventDefault();
    if (!questionText.trim()) return;

    setLoading(true);
    setError("");
    setAnswer(null);
    setStreamingText("");

    const reasoningInterval = simulateReasoning();

    try {
      const token = await getToken();
      const data = await askQuestion(
        questionText,
        3,
        {
          id: user?.id,
          email: user?.emailAddresses[0]?.emailAddress,
          name: user?.fullName || user?.username || user?.id,
        },
        token || undefined
      );

      clearInterval(reasoningInterval);
      setReasoningStep(REASONING_STEPS.length); // complete
      setAnswer(data);

      let idx = 0;
      const streamInterval = setInterval(() => {
        if (idx < data.answer.length) {
          setStreamingText((p) => p + data.answer[idx]);
          idx++;
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        } else {
          clearInterval(streamInterval);
        }
      }, 12);
    } catch (err) {
      clearInterval(reasoningInterval);
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setAnswer(null);
    setStreamingText("");
    setError("");
    setQuery("");
    setReasoningStep(0);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  /* ── Motion variants ─────────────────────────────────── */
  const heroVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.3 } },
  };

  const stagger = {
    animate: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
  };

  const fadeUp = {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
  };

  // Dynamic background style based on input
  const bgOpacity = query.length > 0 ? 0.08 : 0.02;

  return (
    <div className="relative min-h-[calc(100vh-var(--topbar-height))] overflow-hidden bg-[var(--bg-primary)] flex flex-col items-center">

      {/* ── Background: Neural Mesh (Subtle) ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.07]" 
          style={{ 
            backgroundImage: `radial-gradient(var(--text-muted) 0.5px, transparent 0.5px)`, 
            backgroundSize: '24px 24px' 
          }} 
        />
        <div 
          className="absolute inset-0 opacity-[0.4]"
          style={{
            background: `radial-gradient(circle at 50% -20%, var(--brand-glow) 0%, transparent 70%)`
          }}
        />
      </div>

      <div
        className={cn(
          "relative w-full max-w-4xl mx-auto px-6 md:px-12 pb-24 z-10 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
          !answer && !loading ? "pt-24 md:pt-32" : "pt-12 md:pt-16"
        )}
      >
        {/* ── Storytelling Hero ───────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {!answer && !loading && (
            <motion.div
              key="hero"
              variants={stagger}
              initial="initial"
              animate="animate"
              exit={{ opacity: 0, y: -20, transition: { duration: 0.4 } }}
              className="text-center space-y-8 mb-16"
            >
              <motion.div 
                variants={fadeUp} 
                className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] shadow-sm"
              >
                <div className="w-2 h-2 rounded-full bg-[var(--brand)] animate-pulse shadow-[0_0_8px_var(--brand)]" />
                <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[var(--text-secondary)]">
                  Neural Intelligence Node Active
                </span>
              </motion.div>

              <motion.div variants={fadeUp} className="space-y-6">
                <h1
                  className="text-[clamp(2.5rem,8vw,4.5rem)] font-extrabold tracking-tight text-[var(--text-primary)] leading-[0.95]"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {greeting},<br />
                  <span className="text-[var(--brand)]">{firstName}.</span>
                </h1>
                <p
                  className="text-base md:text-xl max-w-2xl mx-auto text-[var(--text-secondary)] leading-relaxed font-medium"
                >
                  Bridge the gap between data and insight. Access our secure documentation network via natural language.
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Active Query Header ─────────────────────────── */}
        <AnimatePresence>
          {(answer || loading) && (
            <motion.div
              key="active-header"
              initial={{ opacity: 0, y: -20, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              className="flex items-center justify-between bg-[var(--bg-secondary)]/80 backdrop-blur-xl border border-[var(--border-subtle)] px-6 py-4 rounded-3xl shadow-[var(--card-shadow)] mb-10"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-[var(--brand)] text-white shadow-lg shadow-[var(--brand-glow)]">
                  <Brain className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-[var(--text-muted)] mb-0.5">
                    Thread Analysis
                  </p>
                  <p className="text-[15px] font-semibold text-[var(--text-primary)] truncate max-w-[180px] sm:max-w-md">
                    {query}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="rounded-xl px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-all"
              >
                <X className="w-3.5 h-3.5 sm:mr-2" />
                <span className="hidden sm:inline">Terminate Thread</span>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Magnetic Search Input ─────────────────────────────────── */}
        <motion.div layout className="relative max-w-3xl mx-auto z-20 group/input">
          <div
            className="relative rounded-[28px] bg-[var(--card-bg)] border border-[var(--border-default)] shadow-[var(--card-shadow-lg)] group-focus-within/input:border-[var(--brand)] group-focus-within/input:shadow-[0_0_0_4px_var(--brand-soft)] transition-all duration-500 overflow-hidden"
          >
            {/* Input area */}
            <div className="flex items-start gap-4 px-8 pt-8 pb-6">
              <div className="w-6 h-6 mt-1 flex-shrink-0 flex items-center justify-center">
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-[var(--brand)]" />
                ) : (
                  <Search className="w-5 h-5 text-[var(--text-muted)] group-focus-within/input:text-[var(--brand)] transition-colors" />
                )}
              </div>
              <textarea
                ref={inputRef}
                id="query-input"
                placeholder="Query the database..."
                className="flex-1 bg-transparent border-none outline-none resize-none text-[18px] md:text-[20px] leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-muted)] placeholder:font-normal font-medium h-[40px] transition-all"
                style={{ minHeight: "60px" }}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAsk();
                  }
                }}
                autoFocus
              />
            </div>

            {/* AI Action Footer */}
            <div className="flex items-center justify-between px-8 py-5 bg-[var(--bg-secondary)]/30 border-t border-[var(--border-subtle)]">
              <div className="flex items-center gap-4 text-[var(--text-muted)]">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] shadow-sm">
                  <Command className="w-3 h-3" />
                  <span className="text-[10px] font-bold">K</span>
                </div>
                <span className="text-[11px] font-semibold tracking-wide">Quick Focus</span>
              </div>

              <button
                onClick={() => handleAsk(undefined, query)}
                disabled={loading || !query.trim()}
                className="h-11 px-8 rounded-xl font-bold text-[11px] tracking-[0.15em] uppercase shadow-lg bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] disabled:opacity-30 transition-all active:scale-[0.97] flex items-center gap-2 group/btn"
              >
                {loading ? "Processing" : (
                  <>
                    Initialize <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── Recommended Prompt Cards (Empty State) ──────────────────────────────── */}
        <AnimatePresence>
          {!answer && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.3 } }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.3 } }}
              className="max-w-3xl mx-auto space-y-6 pt-16"
            >
              <div className="flex items-center justify-center gap-3">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[var(--border-subtle)]" />
                <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--brand)]" />
                  <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[var(--text-muted)]">
                    Neural Suggestions
                  </span>
                </div>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[var(--border-subtle)]" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-stretch">
                {PROMPT_CARDS.map((card, idx) => {
                  const Icon = card.icon === undefined ? TrendingUp : card.icon; 
                  return (
                    <motion.button
                      key={idx}
                      variants={fadeUp}
                      onClick={() => { setQuery(card.query); handleAsk(undefined, card.query); }}
                      className="group flex flex-col items-start p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--border-subtle)] text-left hover:border-[var(--brand)] hover:shadow-[var(--card-shadow-lg)] transition-all duration-500 relative overflow-hidden"
                    >
                      <div className="flex items-center gap-3.5 mb-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-transparent group-hover:border-current transition-all" style={{ backgroundColor: card.bg, color: card.color }}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-sm text-[var(--text-primary)] tracking-tight">
                          {card.title}
                        </span>
                      </div>
                      <p className="text-[14px] text-[var(--text-secondary)] font-medium leading-relaxed mb-6 line-clamp-2">
                        {card.query}
                      </p>
                      <div className="mt-auto flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] group-hover:border-transparent group-hover:bg-white group-hover:text-[var(--brand)] transition-all" style={{ color: card.color }}>
                        <Zap className="w-3 h-3" />
                        {card.outcome}
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Active State: Loading / Results ────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-3xl mx-auto flex items-center gap-5 p-6 rounded-[28px] bg-[var(--danger-soft)] border border-[var(--danger-ring)]"
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white shadow-sm text-[var(--danger)]">
                <Shield className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] mb-1 font-bold tracking-[0.2em] uppercase text-[var(--danger)]">
                  Neural Breach Detection
                </p>
                <p className="text-[15px] font-semibold text-[var(--text-primary)] leading-snug">
                  {error}
                </p>
              </div>
            </motion.div>
          )}

          {(loading || answer) && (
            <motion.div
              key="answer-container"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-3xl mx-auto space-y-8"
            >
              <div
                className={cn(
                  "relative rounded-[32px] overflow-hidden bg-[var(--card-bg)] border transition-all duration-700",
                  loading ? "border-[var(--brand)] shadow-[0_0_60px_rgba(var(--brand-rgb),0.08)]" : "border-[var(--border-default)] shadow-[var(--card-shadow-lg)]"
                )}
              >
                {/* Reasoning Process Header (Loading state) */}
                {loading && (
                  <div className="bg-[var(--bg-secondary)]/50 px-8 py-6 border-b border-[var(--border-subtle)]">
                    <div className="flex items-center gap-3.5 mb-3">
                      <div className="relative">
                        <Loader2 className="w-5 h-5 text-[var(--brand)] animate-spin" />
                        <div className="absolute inset-0 bg-[var(--brand)] blur-[8px] opacity-20" />
                      </div>
                      <span className="text-[12px] font-bold uppercase tracking-[0.2em] text-[var(--brand)]">
                        Deep Neural Synthesis
                      </span>
                    </div>
                    <AnimatePresence mode="popLayout">
                      <motion.div
                        key={reasoningStep}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="text-[14px] font-medium text-[var(--text-secondary)] flex items-center gap-2.5"
                      >
                        <div className="w-4 h-4 rounded-full bg-[var(--success-soft)] flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-[var(--success)]" />
                        </div>
                        {REASONING_STEPS[Math.min(reasoningStep, REASONING_STEPS.length - 1)]}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                )}

                {/* Final Answer Render */}
                <div className="p-8 md:p-10">
                  {!loading && answer && (
                    <div className="flex flex-wrap items-center justify-between mb-10 pb-8 border-b border-[var(--border-subtle)] gap-6">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[var(--brand)] text-white shadow-xl shadow-[var(--brand-glow)]">
                          <MessageSquare className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight" style={{ fontFamily: "var(--font-body)" }}>
                            Intelligence Ready
                          </h3>
                          <div className="flex items-center gap-2.5 mt-1.5">
                            <div className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
                            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Verified Transmission</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <Badge confidence={answer.confidence / (answer.confidence > 1 ? 100 : 1)} className="px-4 py-1.5 rounded-full text-[11px] font-bold border-2">
                          {Math.round(answer.confidence < 1 ? answer.confidence * 100 : answer.confidence)}% Confidence
                        </Badge>
                        <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase">Semantic Match Score</span>
                      </div>
                    </div>
                  )}

                  <div ref={scrollRef} className="max-h-[600px] overflow-auto custom-scrollbar pr-4">
                    {(answer || streamingText) ? (
                      <div className="text-[17px] md:text-[18px] leading-[1.85] text-[var(--text-primary)] whitespace-pre-wrap font-medium font-body selection:bg-[var(--brand-soft)] selection:text-[var(--brand)]">
                        {streamingText}
                        {loading && (
                          <motion.span 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ repeat: Infinity, duration: 0.8 }}
                            className="inline-block w-2 h-5 ml-1 bg-[var(--brand)] rounded-[1px] align-middle shadow-[0_0_8px_var(--brand)]" 
                          />
                        )}
                      </div>
                    ) : (
                      <div className="h-40 flex flex-col items-center justify-center gap-4">
                        <Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
                        <span className="text-sm font-semibold text-[var(--text-muted)] tracking-wide animate-pulse">Establishing secure link...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Source Documentation */}
                {!loading && answer && answer.sources && answer.sources.length > 0 && (
                  <div className="bg-[var(--bg-secondary)]/40 px-8 md:px-10 py-8 border-t border-[var(--border-subtle)]">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-7 h-7 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] flex items-center justify-center">
                        <Navigation className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      </div>
                      <h4 className="text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-muted)]">Source Neural Vectors</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {answer.sources.map((s, i) => (
                        <div key={i} className="group flex flex-col gap-2 p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-subtle)] hover:border-[var(--brand)] hover:shadow-md transition-all cursor-default">
                          <div className="flex items-center justify-between min-w-0">
                            <span className="text-[13px] font-bold text-[var(--text-primary)] truncate pr-3 group-hover:text-[var(--brand)] transition-colors">{s.title}</span>
                            <div className="px-1.5 py-0.5 rounded-md bg-[var(--brand-soft)] text-[var(--brand)] text-[10px] font-bold">
                              {Math.round(s.match * 100)}%
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                             <div className="h-1px flex-1 bg-[var(--border-subtle)]" />
                             <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest whitespace-nowrap">{s.category}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {!loading && answer && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-center gap-4"
                >
                    <Button 
                      variant="outline" 
                      onClick={handleReset}
                      className="rounded-2xl px-6 py-6 border-2 font-bold uppercase tracking-widest text-[11px] hover:bg-[var(--bg-secondary)]"
                    >
                      New Query
                    </Button>
                    <Button 
                      onClick={() => showToast("Synthesis export interface initializing...", "success")}
                      className="rounded-2xl px-8 py-6 font-bold uppercase tracking-widest text-[11px] bg-[var(--text-primary)] text-[var(--bg-primary)] hover:opacity-90"
                    >
                      Export Synthesis
                    </Button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}