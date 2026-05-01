"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  Search, Loader2, ArrowRight, Sparkles, Brain,
  Shield, TrendingUp, Zap, X, Clock,
  CheckCircle2, FileText, Command, MessageSquare, Navigation, Menu, Plus,
} from "lucide-react";
import { askQuestion, QuestionResponse } from "@/lib/api";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/utils";
import { useOrgId } from "@/hooks/useOrgId";
import { useConversations } from "@/hooks/useConversations";
import ConversationSidebar from "@/components/ConversationSidebar";
import ChatArea, { ChatMessage } from "@/components/ChatArea";

/* ─── Constants ─────────────────────────────────────────── */
const PROMPT_CARDS = [
  { icon: Clock, title: "PTO & Leave Policy", query: "How do I request time off and what is our PTO policy?", outcome: "Analyzes 3 HR documents", color: "var(--info)", bg: "var(--info-soft)" },
  { icon: Zap, title: "IT Support Protocol", query: "What is the correct procedure for submitting a high-priority IT ticket?", outcome: "Cross-references IT protocol", color: "var(--warning)", bg: "var(--warning-soft)" },
  { icon: FileText, title: "Expense Guidelines", query: "What is the expense policy for travel and hardware?", outcome: "Extracts financial terms", color: "var(--success)", bg: "var(--success-soft)" },
  { icon: TrendingUp, title: "Performance Reviews", query: "How are performance reviews conducted and what is the schedule?", outcome: "Synthesizes HR schedule", color: "var(--brand)", bg: "var(--brand-soft)" },
];

const REASONING_STEPS = [
  "Initializing neural connection...",
  "Parsing query intent & entity recognition...",
  "Querying vector database for semantic matches...",
  "Cross-referencing organizational policies...",
  "Synthesizing response...",
];

/* ─── Page component ─────────────────────────────────────── */
export default function AskQuestionPage() {
  const { user, isLoaded: userLoaded } = useUser();
  const { getToken, isLoaded: authLoaded, userId } = useAuth();
  const { orgId } = useOrgId();
  const { showToast } = useToast();
  const router = useRouter();

  const {
    conversations,
    isLoading: convsLoading,
    activeConversationId,
    messages: loadedMessages,
    messagesLoading,
    fetchConversations,
    loadConversation,
    deleteConversation,
    startNewConversation,
  } = useConversations();

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [reasoningStep, setReasoningStep] = useState(0);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }, []);
  const firstName = user?.firstName || user?.username || "Colleague";

  // Auth redirect
  useEffect(() => {
    if (authLoaded && userLoaded && !userId) router.replace("/landing");
  }, [authLoaded, userLoaded, userId, router]);

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // When user selects a conversation from sidebar, load its messages
  const handleSelectConversation = useCallback(async (id: string) => {
    setCurrentConvId(id);
    setError("");
    setStreamingText("");
    await loadConversation(id);
    setIsMobileSidebarOpen(false);
  }, [loadConversation]);

  // Map loaded messages to ChatMessage format
  useEffect(() => {
    if (!activeConversationId) return;
    if (messagesLoading) return;
    const mapped: ChatMessage[] = [];
    for (const m of loadedMessages) {
      mapped.push({ role: "user", content: m.question });
      mapped.push({
        role: "assistant",
        content: m.answer,
        confidence: m.confidence_score,
        created_at: m.created_at,
      });
    }
    setChatMessages(mapped);
  }, [loadedMessages, activeConversationId, messagesLoading]);

  const simulateReasoning = () => {
    setReasoningStep(0);
    const interval = setInterval(() => {
      setReasoningStep((prev) => {
        if (prev >= REASONING_STEPS.length - 1) { clearInterval(interval); return prev; }
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
    setStreamingText("");

    // Optimistically add user message
    setChatMessages((prev) => [...prev, { role: "user", content: questionText }]);

    const reasoningInterval = simulateReasoning();

    try {
      const token = await getToken();
      const data = await askQuestion(
        questionText,
        3,
        { id: user?.id, email: user?.emailAddresses[0]?.emailAddress, name: user?.fullName || user?.username || user?.id },
        token || undefined,
        orgId,
        currentConvId ?? undefined,
      );

      clearInterval(reasoningInterval);
      setReasoningStep(REASONING_STEPS.length);

      // Track conversation id
      if (data.conversation_id && !currentConvId) {
        setCurrentConvId(data.conversation_id);
        await fetchConversations();
      }

      // Stream answer char by char
      let idx = 0;
      const fullAnswer = data.answer;
      setStreamingText("");
      const streamInterval = setInterval(() => {
        if (idx < fullAnswer.length) {
          setStreamingText((p) => p + fullAnswer[idx]);
          idx++;
        } else {
          clearInterval(streamInterval);
          // Add AI message to chat
          setChatMessages((prev) => [
            ...prev,
            { role: "assistant", content: fullAnswer, confidence: data.confidence },
          ]);
          setStreamingText("");
          setLoading(false);
        }
      }, 10);

      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (err) {
      clearInterval(reasoningInterval);
      // Remove optimistic user message on error
      setChatMessages((prev) => prev.slice(0, -1));
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    startNewConversation();
    setCurrentConvId(null);
    setChatMessages([]);
    setError("");
    setStreamingText("");
    setQuery("");
    setIsMobileSidebarOpen(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleDeleteConversation = async (id: string) => {
    await deleteConversation(id);
    if (currentConvId === id) {
      setCurrentConvId(null);
      setChatMessages([]);
    }
  };

  /* ── Motion variants ─────────────────────────────────── */
  const stagger: Variants = { animate: { transition: { staggerChildren: 0.03, delayChildren: 0.05 } } };
  const fadeUp: Variants = { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0, 0, 0.2, 1] } } };

  // Auth guards
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

  const hasChatContent = chatMessages.length > 0 || loading;

  return (
    <div
      className="relative flex flex-col md:flex-row overflow-hidden bg-[var(--bg-primary)] -mx-[1.25rem] -mt-[2rem] -mb-[1.25rem] md:m-0 w-[calc(100%+2.5rem)] md:w-full"
      style={{ height: "calc(100vh - var(--topbar-height))" }}
    >
      {/* ── Background mesh ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04] dark:opacity-[0.08]"
          style={{ backgroundImage: `radial-gradient(var(--text-muted) 1px, transparent 1px)`, backgroundSize: "2rem 2rem" }}
        />
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full opacity-[0.4] blur-[7.5rem] mix-blend-screen pointer-events-none" style={{ background: "var(--brand-glow)" }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-[0.2] blur-[7.5rem] mix-blend-screen pointer-events-none" style={{ background: "var(--brand)" }} />
      </div>

      {/* ── Conversation Sidebar ── */}
      <div
        className={cn(
          "absolute md:relative z-40 h-full transition-transform duration-300 md:translate-x-0 shadow-2xl md:shadow-none",
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <ConversationSidebar
          conversations={conversations}
          activeConversationId={currentConvId}
          isLoading={convsLoading}
          onSelect={handleSelectConversation}
          onDelete={handleDeleteConversation}
          onNewChat={handleNewChat}
        />
      </div>

      {/* Mobile Overlay */}
      {isMobileSidebarOpen && (
        <div
          className="absolute inset-0 z-30 bg-black/50 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* ── Main Chat Column ── */}
      <div className="relative flex flex-col flex-1 min-w-0 z-10 h-full">

        {/* Floating Mobile Sidebar Toggle */}
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="md:hidden absolute top-4 left-4 z-20 p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors bg-[var(--surface-1)]/50 backdrop-blur-sm rounded-xl border border-[var(--border-subtle)]"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* ── Hero (empty state) ── */}
        <AnimatePresence mode="wait">
          {!hasChatContent && (
            <motion.div
              key="hero"
              variants={stagger}
              initial="initial"
              animate="animate"
              exit={{ opacity: 0, y: -30, filter: "blur(20px)", transition: { duration: 0.4 } }}
              className="flex flex-col items-center text-center px-4 md:px-6 pt-8 md:pt-12 pb-4 space-y-6 md:space-y-8"
            >
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 md:gap-3 px-4 md:px-5 py-2 md:py-2.5 rounded-full glass-strong shadow-lg ring-1 ring-white/10">
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--brand)] animate-glow-pulse shadow-[0_0_12px_var(--brand)]" />
                <span className="text-[clamp(0.5rem,1.1vw,0.6875rem)] font-bold tracking-[0.25em] uppercase text-[var(--text-secondary)]">Neural Node v3.0 // Ready</span>
              </motion.div>
              <motion.div variants={fadeUp} className="space-y-3 md:space-y-4 w-full px-4">
                <h1 className="text-[clamp(2.25rem,8vw,4rem)] font-bold text-[var(--text-primary)] leading-tight tracking-tight">
                  {greeting},<br /><span className="brand-gradient-text">{firstName}.</span>
                </h1>
                <p className="text-base md:text-lg max-w-xl mx-auto text-[var(--text-secondary)] leading-relaxed font-medium opacity-80">
                  Access our secure knowledge base via the neural link.
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Chat messages ── */}
        {hasChatContent && (
          <ChatArea
            messages={chatMessages}
            isLoading={loading}
            streamingText={streamingText}
          />
        )}

        {/* ── Error ── */}
        <AnimatePresence>
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mx-4 mb-3 flex items-center gap-4 p-4 rounded-2xl bg-[var(--danger-soft)] border border-[var(--danger-ring)]"
            >
              <Shield className="w-5 h-5 text-[var(--danger)] flex-shrink-0" />
              <p className="text-sm font-semibold text-[var(--text-primary)]">{error}</p>
              <button onClick={() => setError("")} className="ml-auto text-[var(--text-muted)] hover:text-[var(--danger)]"><X className="w-4 h-4" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Prompt cards (empty state only) ── */}
        <AnimatePresence>
          {!hasChatContent && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.25 } }}
              className="px-4 md:px-6 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto w-full"
            >
              {PROMPT_CARDS.map((card, idx) => {
                const Icon = card.icon;
                return (
                  <motion.button
                    key={idx}
                    whileHover={{ y: -3, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setQuery(card.query); handleAsk(undefined, card.query); }}
                    className="group flex flex-col items-start p-5 rounded-[1.5rem] text-left border transition-all duration-300 relative overflow-hidden"
                    style={{ background: "var(--surface-1)", borderColor: "var(--border-subtle)" }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: card.bg, color: card.color }}>
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <span className="font-bold text-sm text-[var(--text-primary)]">{card.title}</span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed line-clamp-2">{card.query}</p>
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Input bar ── */}
        <div className="px-3 md:px-4 pb-3 md:pb-4 pt-2 flex-shrink-0">
          <div className="max-w-3xl mx-auto">
            {/* Reasoning steps while loading */}
            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-2 px-4 py-2 rounded-2xl flex items-center gap-2"
                  style={{ background: "var(--surface-1)", border: "1px solid var(--border-subtle)" }}
                >
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--brand)] flex-shrink-0" />
                  <AnimatePresence mode="popLayout">
                    <motion.span
                      key={reasoningStep}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="text-xs font-medium text-[var(--text-secondary)]"
                    >
                      {REASONING_STEPS[Math.min(reasoningStep, REASONING_STEPS.length - 1)]}
                    </motion.span>
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative rounded-[1.5rem] md:rounded-[2rem] overflow-hidden ring-1 ring-white/20 group/input"
              style={{ background: "var(--surface-1)", border: "1px solid var(--border-default)" }}
            >
              <div className="flex items-start gap-2 md:gap-3 px-4 md:px-6 pt-4 md:pt-5 pb-3 md:pb-4">
                {loading
                  ? <Loader2 className="w-5 h-5 mt-1 animate-spin text-[var(--brand)] flex-shrink-0" />
                  : <Search className="w-5 h-5 mt-1 text-[var(--text-muted)] flex-shrink-0 group-focus-within/input:text-[var(--brand)] transition-colors" />
                }
                <textarea
                  ref={inputRef}
                  id="query-input"
                  placeholder="Query the neural network..."
                  className="flex-1 bg-transparent border-none outline-none resize-none text-[clamp(0.95rem,3vw,1.1rem)] leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-muted)] font-medium"
                  style={{ minHeight: "3.5rem", maxHeight: "10rem" }}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAsk(); } }}
                  autoFocus
                />
              </div>
              <div className="flex items-center justify-end md:justify-between gap-3 md:gap-4 px-4 md:px-6 py-2.5 md:py-3 border-t border-[var(--border-subtle)]" style={{ background: "var(--surface-2)" }}>
                <div className="hidden md:flex items-center gap-2 text-[var(--text-muted)]">
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg border border-[var(--border-subtle)]" style={{ background: "var(--bg-tertiary)" }}>
                    <Command className="w-3 h-3 opacity-50" />
                    <span className="text-[0.6rem] font-bold">K</span>
                  </div>
                  <span className="text-xs font-bold opacity-60">Focus</span>
                </div>
                <button
                  onClick={() => handleAsk(undefined, query)}
                  disabled={loading || !query.trim()}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs tracking-widest uppercase text-white disabled:opacity-40 transition-all duration-300 hover:-translate-y-0.5 active:scale-95 hover:shadow-lg"
                  style={{ background: "linear-gradient(to right, var(--brand), #8b5cf6)" }}
                >
                  {loading ? "Processing..." : <>Initialize <span className="hidden sm:inline ml-1">Link</span> <ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}