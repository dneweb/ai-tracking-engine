"use client";

import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, User, Shield, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  confidence?: number;
  created_at?: string;
}

interface ChatAreaProps {
  messages: ChatMessage[];
  isLoading: boolean;
  streamingText: string;
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = confidence < 1 ? Math.round(confidence * 100) : Math.round(confidence);
  const isHigh = pct >= 80;
  const isMed = pct >= 60;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold border"
      style={{
        fontSize: "0.5625rem",
        letterSpacing: "0.1em",
        background: isHigh
          ? "var(--success-soft)"
          : isMed
          ? "var(--warning-soft)"
          : "var(--danger-soft)",
        color: isHigh
          ? "var(--success)"
          : isMed
          ? "var(--warning)"
          : "var(--danger)",
        borderColor: isHigh
          ? "var(--success-ring)"
          : isMed
          ? "var(--warning-ring)"
          : "var(--danger-ring)",
      }}
    >
      <Shield className="w-2.5 h-2.5" />
      {pct}% confidence
    </span>
  );
}

export default function ChatArea({ messages, isLoading, streamingText }: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  if (messages.length === 0 && !isLoading) return null;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 custom-scrollbar">
      <AnimatePresence initial={false}>
        {messages.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }}
            className={cn(
              "flex gap-3 max-w-[85%]",
              msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
            )}
          >
            {/* Avatar */}
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-1"
              style={{
                background:
                  msg.role === "user" ? "var(--brand)" : "var(--surface-2)",
                color:
                  msg.role === "user" ? "white" : "var(--text-secondary)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              {msg.role === "user" ? (
                <User className="w-3.5 h-3.5" />
              ) : (
                <Brain className="w-3.5 h-3.5" style={{ color: "var(--brand)" }} />
              )}
            </div>

            {/* Bubble */}
            <div className="flex flex-col gap-1.5">
              <div
                className="px-4 py-3 rounded-2xl leading-relaxed"
                style={{
                  fontSize: "0.9375rem",
                  background:
                    msg.role === "user"
                      ? "var(--brand)"
                      : "var(--surface-1)",
                  color:
                    msg.role === "user" ? "white" : "var(--text-primary)",
                  border:
                    msg.role === "assistant"
                      ? "1px solid var(--border-subtle)"
                      : "none",
                  borderRadius:
                    msg.role === "user"
                      ? "1.25rem 1.25rem 0.25rem 1.25rem"
                      : "0.25rem 1.25rem 1.25rem 1.25rem",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {msg.content}
              </div>
              {msg.role === "assistant" && msg.confidence !== undefined && (
                <ConfidenceBadge confidence={msg.confidence} />
              )}
            </div>
          </motion.div>
        ))}

        {/* Streaming AI response */}
        {isLoading && streamingText && (
          <motion.div
            key="streaming"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 max-w-[85%] mr-auto"
          >
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-1"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <Brain className="w-3.5 h-3.5" style={{ color: "var(--brand)" }} />
            </div>
            <div
              className="px-4 py-3 rounded-2xl leading-relaxed"
              style={{
                fontSize: "0.9375rem",
                background: "var(--surface-1)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "0.25rem 1.25rem 1.25rem 1.25rem",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {streamingText}
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ repeat: Infinity, duration: 0.7 }}
                className="inline-block w-2 h-4 ml-0.5 rounded-sm align-middle"
                style={{ background: "var(--brand)" }}
              />
            </div>
          </motion.div>
        )}

        {/* Loading skeleton when no streaming text yet */}
        {isLoading && !streamingText && (
          <motion.div
            key="thinking"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3 mr-auto"
          >
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)" }}
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "var(--brand)" }} />
            </div>
            <div
              className="px-4 py-3 rounded-2xl flex items-center gap-2"
              style={{
                background: "var(--surface-1)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "0.25rem 1.25rem 1.25rem 1.25rem",
              }}
            >
              {[0, 0.15, 0.3].map((delay, i) => (
                <motion.div
                  key={i}
                  animate={{ y: [0, -6, 0] }}
                  transition={{ repeat: Infinity, duration: 0.8, delay }}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: "var(--brand)" }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div ref={bottomRef} />
    </div>
  );
}
