"use client";

/**
 * Members & Approvals Page — KnowledgeEngine (Nexus AI)
 * Route: /dashboard/members
 *
 * Visible to: owner and admin only.
 * Tabs: Members (approved) | Pending (join requests with badge count).
 *
 * Layout, typography, card styles, and animations match all existing
 * dashboard pages exactly (see analytics/page.tsx for reference pattern).
 */

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useRole } from "@/hooks/useRole";
import { useToast } from "@/context/ToastContext";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  Users,
  Clock,
  Shield,
  ShieldCheck,
  Loader2,
  Trash2,
  CheckCircle2,
  XCircle,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { apiCall } from "@/lib/api-client";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Member {
  clerk_id: string;
  email: string;
  full_name: string;
  role: "owner" | "admin" | "member" | "viewer";
  status: string;
  approved_at: string | null;
  created_at: string;
}

interface PendingRequest {
  _id: string;
  clerk_id: string;
  email: string;
  full_name: string;
  requested_role: "admin" | "member" | "viewer";
  created_at: string;
}

interface MembersListResponse {
  members: Member[];
  total: number;
}

interface PendingResponse {
  requests: PendingRequest[];
  total: number;
}

// ── Motion ─────────────────────────────────────────────────────────────────────

const fadeUp: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.19, 1, 0.22, 1] },
  },
};

const stagger: Variants = {
  animate: { transition: { staggerChildren: 0.07 } },
};

// ── Role badge ─────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const cfg = {
    owner:  { label: "Owner",  bg: "rgba(99,102,241,0.1)",  border: "rgba(99,102,241,0.25)", color: "#818cf8" },
    admin:  { label: "Admin",  bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)",  color: "#f59e0b" },
    member: { label: "Member", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)",  color: "#10b981" },
    viewer: { label: "Viewer", bg: "rgba(148,163,184,0.08)",border: "rgba(148,163,184,0.2)", color: "#94a3b8" },
  }[role] ?? { label: role, bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)", color: "#94a3b8" };

  return (
    <span
      className="px-3 py-1 rounded-full text-[clamp(0.5rem,1.0vw,0.625rem)] font-bold uppercase tracking-wider"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

// ── Confirmation modal ─────────────────────────────────────────────────────────

function ConfirmModal({
  name,
  onConfirm,
  onCancel,
  loading,
}: {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.7)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
      />
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-sm rounded-[1.75rem] p-8 space-y-6"
        style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <AlertTriangle className="w-6 h-6" style={{ color: "#ef4444" }} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Remove member?</h3>
            <p className="text-sm mt-0.5" style={{ color: "#94a3b8" }}>
              Remove <span className="text-white font-semibold">{name}</span> from the organisation?
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl text-sm font-bold text-white transition-all hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            style={{ background: "#ef4444" }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Remove
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Rejection input inline ─────────────────────────────────────────────────────

function RejectPanel({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState("");
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-3 space-y-3 overflow-hidden"
    >
      <input
        type="text"
        placeholder="Reason (optional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="w-full px-4 py-3 rounded-xl text-sm font-medium text-white bg-[#0a0a0f] border border-white/8 outline-none focus:border-[#6366f1]/50 transition-all"
      />
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-70"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          Cancel
        </button>
        <button
          onClick={() => onConfirm(reason)}
          disabled={loading}
          className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
          style={{ background: "#ef4444" }}
        >
          {loading && <Loader2 className="w-3 h-3 animate-spin" />}
          Confirm Rejection
        </button>
      </div>
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function MembersPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const { role, isAdmin, isLoaded: roleLoaded } = useRole();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<"members" | "pending">("members");
  const [members, setMembers]     = useState<Member[]>([]);
  const [pending, setPending]     = useState<PendingRequest[]>([]);
  const [loading, setLoading]     = useState(true);

  // Confirm-remove state
  const [confirmTarget, setConfirmTarget]   = useState<Member | null>(null);
  const [removeLoading, setRemoveLoading]   = useState(false);

  // Approve/reject state
  const [actionLoading, setActionLoading]   = useState<string | null>(null);
  const [rejectOpen, setRejectOpen]         = useState<string | null>(null);

  // ── Redirect non-admin (member and viewer cannot access this page) ──────────
  useEffect(() => {
    if (roleLoaded && role !== "owner" && role !== "admin") {
      router.replace("/dashboard");
    }
  }, [roleLoaded, role, router]);

  // ── Fetch data ──────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const [mRes, pRes] = await Promise.all([
        apiCall<MembersListResponse>("/auth/members-list", undefined, token ?? undefined),
        apiCall<PendingResponse>("/auth/pending-requests", undefined, token ?? undefined),
      ]);
      if (mRes.data) setMembers(mRes.data.members);
      if (pRes.data) setPending(pRes.data.requests);
    } catch {
      showToast("Failed to load member data.", "error" as never);
    } finally {
      setLoading(false);
    }
  }, [getToken, showToast]);

  useEffect(() => {
    if (roleLoaded && (role === "owner" || role === "admin")) loadData();
  }, [roleLoaded, role, loadData]);

  // ── Remove member ───────────────────────────────────────────────────────────
  const handleRemove = async () => {
    if (!confirmTarget) return;
    setRemoveLoading(true);
    try {
      const token = await getToken();
      const { error } = await apiCall(
        "/auth/remove-member",
        {
          method: "DELETE",
          body: JSON.stringify({ target_clerk_id: confirmTarget.clerk_id }),
        },
        token ?? undefined
      );
      if (error) {
        showToast(error, "error" as never);
      } else {
        setMembers((m) => m.filter((x) => x.clerk_id !== confirmTarget.clerk_id));
        showToast("Member removed.", "success");
      }
    } finally {
      setRemoveLoading(false);
      setConfirmTarget(null);
    }
  };

  // ── Approve/reject request ──────────────────────────────────────────────────
  const handleApproveReject = async (
    req: PendingRequest,
    action: "approved" | "rejected",
    rejection_reason?: string
  ) => {
    setActionLoading(req._id);
    try {
      const token = await getToken();
      const { error } = await apiCall(
        "/auth/approve-request",
        {
          method: "POST",
          body: JSON.stringify({
            request_id: req._id,
            action,
            rejection_reason: rejection_reason ?? null,
          }),
        },
        token ?? undefined
      );
      if (error) {
        showToast(error, "error" as never);
      } else {
        setPending((p) => p.filter((x) => x._id !== req._id));
        showToast(
          action === "approved" ? "Request approved." : "Request rejected.",
          "success"
        );
        if (action === "approved") await loadData(); // refresh members tab
      }
    } finally {
      setActionLoading(null);
      setRejectOpen(null);
    }
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const canRemove = (m: Member): boolean => {
    if (m.role === "owner") return false;
    if (role === "admin" && m.role === "admin") return false;
    return role === "owner" || role === "admin";
  };

  const formatDate = (iso: string | null): string => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading || !roleLoaded) {
    return (
      <div className="container-app py-12 space-y-8">
        <div className="h-12 w-64 skeleton rounded-2xl" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 skeleton rounded-[1.5rem]" />
          ))}
        </div>
      </div>
    );
  }

  // ── Page ────────────────────────────────────────────────────────────────────
  return (
    <>
      <AnimatePresence>
        {confirmTarget && (
          <ConfirmModal
            name={confirmTarget.full_name || confirmTarget.email}
            onConfirm={handleRemove}
            onCancel={() => setConfirmTarget(null)}
            loading={removeLoading}
          />
        )}
      </AnimatePresence>

      <div className="container-app py-12 md:py-20 space-y-10">

        {/* ── Header ── */}
        <motion.div variants={fadeUp} initial="initial" animate="animate">
          <h1
            className="text-[clamp(2.2rem,6vw,3.5rem)] font-bold tracking-tight text-[var(--text-primary)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Team{" "}
            <span className="text-[var(--brand)]">Members.</span>
          </h1>
          <p className="text-[clamp(0.65rem,1.3vw,0.8125rem)] font-semibold text-[var(--text-muted)] tracking-widest uppercase mt-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-[var(--brand)]" />
            Manage organisation access and approvals
          </p>
        </motion.div>

        {/* ── Tabs ── */}
        <motion.div variants={fadeUp} initial="initial" animate="animate">
          <div
            className="flex p-1.5 rounded-2xl w-fit"
            style={{ background: "var(--bg-secondary)", border: "0.5px solid var(--border-subtle)" }}
          >
            {(["members", "pending"] as const).map((tab) => (
              <button
                key={tab}
                id={`members-tab-${tab}`}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-[clamp(0.5rem,1.0vw,0.625rem)] font-bold uppercase tracking-widest transition-all duration-300 flex items-center gap-2",
                  activeTab === tab
                    ? "bg-[var(--brand)] text-white shadow-md"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                {tab === "members" ? <Users className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                {tab === "members" ? "Members" : "Pending"}
                {tab === "pending" && pending.length > 0 && (
                  <span
                    className="w-5 h-5 rounded-full text-[clamp(0.45rem,0.9vw,0.5625rem)] flex items-center justify-center font-extrabold"
                    style={{ background: "rgba(239,68,68,0.9)", color: "#fff" }}
                  >
                    {pending.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── Tab content ── */}
        <AnimatePresence mode="wait">

          {/* ══════════ MEMBERS TAB ══════════ */}
          {activeTab === "members" && (
            <motion.div
              key="tab-members"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <div
                className="rounded-[2.5rem] overflow-hidden"
                style={{
                  background: "var(--card-bg)",
                  border: "0.5px solid var(--border-subtle)",
                  boxShadow: "var(--card-shadow)",
                }}
              >
                {/* Table header */}
                <div
                  className="px-8 md:px-10 py-5 flex items-center justify-between"
                  style={{ borderBottom: "0.5px solid var(--border-subtle)", background: "var(--bg-secondary)" }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center"
                      style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
                    >
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h2
                        className="text-xl font-bold text-[var(--text-primary)]"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        Approved Members
                      </h2>
                      <p className="text-[clamp(0.5rem,1.0vw,0.625rem)] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                        {members.length} total
                      </p>
                    </div>
                  </div>
                </div>

                {members.length === 0 ? (
                  <div className="py-20 flex flex-col items-center gap-4 opacity-30">
                    <Users className="w-12 h-12" />
                    <p className="text-[clamp(0.55rem,1.1vw,0.6875rem)] font-bold uppercase tracking-widest">No members found</p>
                  </div>
                ) : (
                  <motion.div variants={stagger} initial="initial" animate="animate">
                    {members.map((m) => (
                      <motion.div
                        key={m.clerk_id}
                        variants={fadeUp}
                        className="flex flex-col sm:flex-row sm:items-center justify-between px-8 md:px-10 py-5 gap-4 group hover:bg-[var(--bg-secondary)] transition-all duration-300"
                        style={{ borderBottom: "0.5px solid var(--border-subtle)" }}
                      >
                        {/* Info */}
                        <div className="flex items-center gap-5 min-w-0">
                          <div
                            className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 font-bold text-sm"
                            style={{ background: "var(--bg-secondary)", border: "0.5px solid var(--border-subtle)", color: "var(--brand)" }}
                          >
                            {(m.full_name || m.email).charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-[var(--text-primary)] text-sm truncate">
                              {m.full_name || "—"}
                            </p>
                            <p className="text-xs text-[var(--text-muted)] truncate">{m.email}</p>
                          </div>
                        </div>

                        {/* Role + Date + Actions */}
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <RoleBadge role={m.role} />
                          <span className="text-[clamp(0.5rem,1.0vw,0.625rem)] font-bold text-[var(--text-muted)] uppercase tracking-tight hidden md:block">
                            {formatDate(m.created_at)}
                          </span>
                          {canRemove(m) ? (
                            <button
                              id={`remove-member-${m.clerk_id}`}
                              onClick={() => setConfirmTarget(m)}
                              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95"
                              style={{
                                background: "rgba(239,68,68,0.08)",
                                border: "1px solid rgba(239,68,68,0.2)",
                                color: "#ef4444",
                              }}
                              title="Remove member"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <div className="w-8 h-8" />
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* ══════════ PENDING TAB ══════════ */}
          {activeTab === "pending" && (
            <motion.div
              key="tab-pending"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Header card */}
              <div
                className="px-8 md:px-10 py-5 rounded-[1.75rem] flex items-center gap-4"
                style={{ background: "var(--card-bg)", border: "0.5px solid var(--border-subtle)" }}
              >
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#f59e0b" }}
                >
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)]" style={{ fontFamily: "var(--font-display)" }}>
                    Pending Requests
                  </h2>
                  <p className="text-[clamp(0.5rem,1.0vw,0.625rem)] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                    {pending.length} awaiting review
                  </p>
                </div>
              </div>

              {pending.length === 0 ? (
                <div
                  className="py-20 flex flex-col items-center gap-4 opacity-30 rounded-[2.5rem]"
                  style={{ background: "var(--card-bg)", border: "0.5px solid var(--border-subtle)" }}
                >
                  <CheckCircle2 className="w-12 h-12" />
                  <p className="text-[clamp(0.55rem,1.1vw,0.6875rem)] font-bold uppercase tracking-widest">No pending requests</p>
                </div>
              ) : (
                <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-3">
                  {pending.map((req) => {
                    const isAdminReq = req.requested_role === "admin";
                    const callerIsAdmin = role === "admin";
                    const canAct = !(isAdminReq && callerIsAdmin);

                    return (
                      <motion.div
                        key={req._id}
                        variants={fadeUp}
                        layout
                        className="p-6 md:p-8 rounded-[1.75rem]"
                        style={{
                          background: "var(--card-bg)",
                          border: "0.5px solid var(--border-subtle)",
                          boxShadow: "var(--card-shadow)",
                        }}
                      >
                        {/* Request info row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-4 min-w-0">
                            <div
                              className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 font-bold text-sm"
                              style={{ background: "var(--bg-secondary)", border: "0.5px solid var(--border-subtle)", color: "var(--brand)" }}
                            >
                              {(req.full_name || req.email).charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-[var(--text-primary)] text-sm truncate">
                                {req.full_name || "—"}
                              </p>
                              <p className="text-xs text-[var(--text-muted)] truncate">{req.email}</p>
                              <p className="text-[clamp(0.5rem,1.0vw,0.625rem)] text-[var(--text-muted)] mt-0.5">
                                Requested {formatDate(req.created_at)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 flex-shrink-0">
                            <RoleBadge role={req.requested_role} />
                            {isAdminReq && (
                              <div
                                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[clamp(0.45rem,0.9vw,0.5625rem)] font-bold uppercase tracking-wider"
                                style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#f59e0b" }}
                              >
                                <Shield className="w-3 h-3" />
                                {callerIsAdmin ? "Owner approval required" : "High privilege"}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        {canAct ? (
                          <div className="mt-5 flex flex-col gap-3">
                            <div className="flex gap-3">
                              {/* Approve */}
                              <button
                                id={`approve-req-${req._id}`}
                                onClick={() => handleApproveReject(req, "approved")}
                                disabled={actionLoading === req._id}
                                className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-[0.98]"
                                style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981" }}
                              >
                                {actionLoading === req._id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                )}
                                Approve
                              </button>

                              {/* Reject */}
                              <button
                                id={`reject-req-${req._id}`}
                                onClick={() =>
                                  setRejectOpen((prev) => (prev === req._id ? null : req._id))
                                }
                                disabled={actionLoading === req._id}
                                className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-[0.98]"
                                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Reject
                              </button>
                            </div>

                            <AnimatePresence>
                              {rejectOpen === req._id && (
                                <RejectPanel
                                  loading={actionLoading === req._id}
                                  onConfirm={(reason) =>
                                    handleApproveReject(req, "rejected", reason)
                                  }
                                  onCancel={() => setRejectOpen(null)}
                                />
                              )}
                            </AnimatePresence>
                          </div>
                        ) : (
                          <div
                            className="mt-5 px-4 py-3 rounded-xl flex items-center gap-2 text-xs font-semibold"
                            style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", color: "#f59e0b" }}
                          >
                            <Shield className="w-3.5 h-3.5" />
                            Only the organisation Owner can approve admin requests.
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer breadcrumb */}
        <motion.div
          variants={fadeUp}
          initial="initial"
          animate="animate"
          className="flex items-center gap-2 text-[clamp(0.5rem,1.0vw,0.625rem)] font-bold uppercase tracking-widest text-[var(--text-muted)]"
        >
          <span>Dashboard</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-[var(--text-primary)]">Members</span>
        </motion.div>
      </div>
    </>
  );
}
