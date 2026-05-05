"use client";

/**
 * Pending Approval Page — Memora (Memora)
 *
 * Shown after a join request is submitted.
 * Lets the user poll their approval status.
 */

import { useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Clock, Loader2, RefreshCw, LogOut } from "lucide-react";
import { apiCall } from "@/lib/api-client";
import { getRedirectForRole } from "@/lib/roleRedirects";

interface ValidateResponse {
  success: boolean;
  role: string;
  redirect_to: string;
}

export default function PendingPage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const [checking, setChecking]     = useState(false);
  const [statusMsg, setStatusMsg]   = useState<{ text: string; type: "info" | "error" | "success" } | null>(null);

  // Derive the org_slug from Clerk public_metadata (set at register-member time)
  const metadata = (user?.publicMetadata ?? {}) as Record<string, string>;
  const orgId    = metadata.org_id ?? "";

  const handleCheckStatus = async () => {
    if (!user) return;

    setChecking(true);
    setStatusMsg(null);

    // We need the org_slug — fetch it from org_settings via org_id
    // The simplest approach: try validate-signin with the stored org_slug from metadata.
    // If the user is approved the backend will return success.
    // If still pending / rejected the backend will return 403 with the right error code.

    const { data, error, status } = await apiCall<ValidateResponse>(
      "/auth/validate-signin",
      {
        method: "POST",
        body: JSON.stringify({
          clerk_id: user.id,
          // Use org_id as a stand-in; the backend resolves by org_slug.
          // We store org_slug in a cookie/localStorage on the sign-up page if needed.
          // Fallback: re-read from public_metadata if present.
          org_slug: metadata.org_slug ?? orgId,
        }),
      }
    );

    setChecking(false);

    if (data?.success) {
      setStatusMsg({ text: "Approved! Redirecting…", type: "success" });
      setTimeout(() => router.push(getRedirectForRole(data.role)), 800);
      return;
    }

    if (status === 403) {
      if (error?.includes("pending")) {
        setStatusMsg({ text: "Still pending. Check back later.", type: "info" });
      } else if (error?.includes("rejected")) {
        setStatusMsg({ text: "Your request was rejected. Contact your admin.", type: "error" });
      } else {
        setStatusMsg({ text: error ?? "Access denied.", type: "error" });
      }
      return;
    }

    setStatusMsg({ text: error ?? "Could not check status. Is the backend running?", type: "error" });
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/sign-in");
  };

  if (!isLoaded) return null;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "#0a0a0f" }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 50% 35% at 50% 0%, rgba(99,102,241,0.10) 0%, transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-md">
        <div
          className="rounded-[2.0rem] p-10 text-center space-y-8"
          style={{
            background: "#111118",
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
          }}
        >
          {/* Icon */}
          <motion.div
            className="flex items-center justify-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{
                background: "rgba(99,102,241,0.1)",
                border: "1px solid rgba(99,102,241,0.2)",
              }}
            >
              <Clock className="w-10 h-10" style={{ color: "var(--brand)" }} />
            </div>
          </motion.div>

          {/* Text */}
          <motion.div
            className="space-y-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <h1 className="text-2xl font-bold text-white">Request submitted.</h1>
            <p className="text-sm leading-relaxed" style={{ color: "#94a3b8" }}>
              Your request to join has been sent to the organisation admin for
              approval. You&apos;ll be able to sign in once your request is
              approved.
            </p>
          </motion.div>

          {/* Status feedback */}
          {statusMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl px-4 py-3 text-sm font-medium"
              style={{
                background:
                  statusMsg.type === "success"
                    ? "rgba(16,185,129,0.08)"
                    : statusMsg.type === "error"
                    ? "rgba(239,68,68,0.08)"
                    : "rgba(99,102,241,0.08)",
                border: `1px solid ${
                  statusMsg.type === "success"
                    ? "rgba(16,185,129,0.2)"
                    : statusMsg.type === "error"
                    ? "rgba(239,68,68,0.2)"
                    : "rgba(99,102,241,0.2)"
                }`,
                color:
                  statusMsg.type === "success"
                    ? "#10b981"
                    : statusMsg.type === "error"
                    ? "#f87171"
                    : "#818cf8",
              }}
            >
              {statusMsg.text}
            </motion.div>
          )}

          {/* Check status button */}
          <motion.button
            id="pending-check-status"
            onClick={handleCheckStatus}
            disabled={checking}
            className="w-full py-3.5 rounded-2xl text-sm font-bold tracking-wide flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 active:scale-[0.98]"
            style={{
              background: "var(--brand)",
              color: "#fff",
            }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            whileHover={{ backgroundColor: "#5254cc" }}
          >
            {checking ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {checking ? "Checking…" : "Check approval status"}
          </motion.button>

          {/* Footer links */}
          <motion.div
            className="space-y-3 pt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            <p className="text-sm" style={{ color: "#94a3b8" }}>
              Wrong organisation?{" "}
              <a
                href="/sign-up"
                className="font-semibold hover:underline"
                style={{ color: "var(--brand)" }}
              >
                Start over →
              </a>
            </p>

            <button
              id="pending-signout"
              onClick={handleSignOut}
              className="flex items-center justify-center gap-2 mx-auto text-xs font-medium hover:underline transition-opacity hover:opacity-80"
              style={{ color: "#94a3b8" }}
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
