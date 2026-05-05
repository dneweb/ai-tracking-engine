"use client";
import { useAuth } from "@clerk/nextjs";
import { useState, useEffect, useCallback } from "react";
import { useOrgId } from "@/hooks/useOrgId";

// Always proxy through Next.js → /backend-api/:path* → Render /api/:path*
const API_BASE = "/backend-api";

export interface Conversation {
  conversation_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface ConversationMessage {
  conversation_id: string;
  question: string;
  answer: string;
  confidence_score: number;
  created_at: string;
  user_id?: string;
  category?: string;
  retrieved_doc_title?: string;
}

export function useConversations() {
  const { getToken } = useAuth();
  const { orgId } = useOrgId();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!orgId) return;
    setIsLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/conversations`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Org-ID": orgId,
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      setConversations(data.conversations ?? []);
    } catch {
      /* silent */
    } finally {
      setIsLoading(false);
    }
  }, [getToken, orgId]);

  const loadConversation = useCallback(
    async (conversation_id: string) => {
      if (!orgId) return;
      setActiveConversationId(conversation_id);
      setMessagesLoading(true);
      try {
        const token = await getToken();
        const res = await fetch(
          `${API_BASE}/conversations/${conversation_id}/messages`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "X-Org-ID": orgId,
            },
          }
        );
        if (!res.ok) return;
        const data = await res.json();
        setMessages(data.messages ?? []);
      } catch {
        /* silent */
      } finally {
        setMessagesLoading(false);
      }
    },
    [getToken, orgId]
  );

  const deleteConversation = useCallback(
    async (conversation_id: string) => {
      if (!orgId) return;
      try {
        const token = await getToken();
        await fetch(`${API_BASE}/conversations/${conversation_id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "X-Org-ID": orgId,
          },
        });
        setConversations((prev) =>
          prev.filter((c) => c.conversation_id !== conversation_id)
        );
        if (activeConversationId === conversation_id) {
          setActiveConversationId(null);
          setMessages([]);
        }
      } catch {
        /* silent */
      }
    },
    [getToken, orgId, activeConversationId]
  );

  const startNewConversation = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
  }, []);

  useEffect(() => {
    if (orgId) fetchConversations();
  }, [orgId, fetchConversations]);

  return {
    conversations,
    isLoading,
    activeConversationId,
    setActiveConversationId,
    messages,
    messagesLoading,
    fetchConversations,
    loadConversation,
    deleteConversation,
    startNewConversation,
  };
}
