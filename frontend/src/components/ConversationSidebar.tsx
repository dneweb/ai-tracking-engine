"use client";

import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Plus, Trash2, ChevronRight } from "lucide-react";
import { Conversation } from "@/hooks/useConversations";
import { cn } from "@/lib/utils";

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  isLoading: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNewChat: () => void;
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ConversationSidebar({
  conversations,
  activeConversationId,
  isLoading,
  onSelect,
  onDelete,
  onNewChat,
}: ConversationSidebarProps) {
  return (
    <aside
      className="flex flex-col h-full"
      style={{
        width: "17.5rem",
        minWidth: "17.5rem",
        borderRight: "1px solid var(--border-subtle)",
        background: "var(--bg-secondary)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-5"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4" style={{ color: "var(--brand)" }} />
          <span
            className="font-bold uppercase tracking-widest"
            style={{ fontSize: "0.625rem", color: "var(--text-muted)" }}
          >
            Conversations
          </span>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onNewChat}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all"
          style={{
            fontSize: "0.625rem",
            background: "var(--brand)",
            color: "white",
            letterSpacing: "0.08em",
          }}
          title="New Chat"
        >
          <Plus className="w-3 h-3" />
          New
        </motion.button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
        {isLoading ? (
          <div className="flex flex-col gap-2 px-3 pt-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 rounded-2xl animate-pulse"
                style={{ background: "var(--surface-2)" }}
              />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
            >
              <MessageSquare className="w-5 h-5 opacity-40" />
            </div>
            <p
              className="font-bold uppercase tracking-widest"
              style={{ fontSize: "0.5625rem", color: "var(--text-muted)", opacity: 0.5 }}
            >
              No conversations yet
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {conversations.map((conv) => {
              const isActive = conv.conversation_id === activeConversationId;
              return (
                <motion.div
                  key={conv.conversation_id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.2 }}
                  className="group relative mx-2 my-0.5"
                >
                  <button
                    onClick={() => onSelect(conv.conversation_id)}
                    className={cn(
                      "w-full text-left px-3 py-3 rounded-2xl transition-all duration-200 flex flex-col gap-1 relative overflow-hidden",
                      isActive
                        ? ""
                        : "hover:bg-[var(--surface-1)]"
                    )}
                    style={
                      isActive
                        ? {
                            background: "var(--brand-soft)",
                            boxShadow: "0 0 0 1px var(--brand)",
                          }
                        : {}
                    }
                  >
                    {isActive && (
                      <div
                        className="absolute left-0 top-0 bottom-0 w-0.5 rounded-r"
                        style={{ background: "var(--brand)" }}
                      />
                    )}
                    {/* Title */}
                    <span
                      className="font-semibold leading-snug line-clamp-2 pr-6"
                      style={{
                        fontSize: "0.8125rem",
                        color: isActive ? "var(--brand)" : "var(--text-primary)",
                      }}
                    >
                      {conv.title}
                    </span>
                    {/* Meta */}
                    <div className="flex items-center gap-2">
                      <span
                        className="font-bold uppercase tracking-widest"
                        style={{ fontSize: "0.5rem", color: "var(--text-muted)", opacity: 0.6 }}
                      >
                        {formatRelativeTime(conv.updated_at)}
                      </span>
                      <span
                        className="px-1.5 py-0.5 rounded-md font-bold"
                        style={{
                          fontSize: "0.5rem",
                          background: "var(--surface-2)",
                          color: "var(--text-muted)",
                        }}
                      >
                        {conv.message_count}
                      </span>
                    </div>
                  </button>

                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(conv.conversation_id);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all"
                    style={{ color: "var(--text-muted)" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "var(--danger)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "var(--text-muted)")
                    }
                    title="Delete conversation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </aside>
  );
}
