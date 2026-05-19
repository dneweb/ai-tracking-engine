"use client";

/**
   Billing & Subscription Page — Memora
 * Route: /dashboard/billing
 *
 * Visible to: owner and admin for action/management, members and viewers as read-only.
 * Displays: Current plan status, usage metrics, and subscription plans (Pro, Business).
 */

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useRole } from "@/hooks/useRole";
import { useToast } from "@/context/ToastContext";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  CreditCard,
  CheckCircle2,
  Lock,
  ArrowRight,
  Shield,
  Loader2,
  FileText,
  Users,
  Brain,
  ExternalLink,
} from "lucide-react";
import { apiCall } from "@/lib/api-client";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SubscriptionInfo {
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  plan: "trial" | "pro" | "business";
  status: "active" | "past_due" | "canceled" | "trialing" | string;
  price_id: string;
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end?: boolean;
}

interface LimitsInfo {
  plan: "trial" | "pro" | "business" | string;
  max_documents: number;
  max_members: number;
  max_queries_per_month: number;
  queries_used_this_month: number;
  org_name: string;
  org_slug: string;
}

interface UsageInfo {
  documents: number;
  members: number;
  queries: number;
}

interface PlanInfo {
  id: string;
  name: string;
  tagline: string;
  description: string;
  price: string;
  price_id: string;
  features: string[];
}

interface SubscriptionStatusResponse {
  subscription: SubscriptionInfo | null;
  limits: LimitsInfo;
  usage: UsageInfo;
  plans?: PlanInfo[];
}

// ── Framer Motion Variants ─────────────────────────────────────────────────────

const fadeUp: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.19, 1, 0.22, 1] },
  },
};

const stagger: Variants = {
  animate: { transition: { staggerChildren: 0.08 } },
};

export default function BillingPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const { role, isOwner, isAdmin, isLoaded: roleLoaded } = useRole();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [billingData, setBillingData] = useState<SubscriptionStatusResponse | null>(null);
  
  // Checkout & Portal redirection loading states
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  // ── Plan Setup ─────────────────────────────────────────────────────────────
  // Available subscription plans fetched dynamically from backend.

  const fetchBillingStatus = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const activeOrgId = typeof window !== "undefined" ? localStorage.getItem("nexus_active_org_id") : "";
      
      const { data, error } = await apiCall<SubscriptionStatusResponse>(
        "/stripe/subscription-status",
        {
          headers: {
            "X-Org-ID": activeOrgId || "",
          },
        },
        token ?? undefined
      );

      if (error) {
        showToast(error, "error" as never);
      } else if (data) {
        setBillingData(data);
      }
    } catch (err) {
      showToast("Failed to fetch subscription status.", "error" as never);
    } finally {
      setLoading(false);
    }
  }, [getToken, showToast]);

  useEffect(() => {
    if (roleLoaded) {
      fetchBillingStatus();
    }
  }, [roleLoaded, fetchBillingStatus]);

  // ── Checkout creation & Redirect ──────────────────────────────────────────
  const handleUpgrade = async (priceId: string) => {
    if (!isOwner && !isAdmin) {
      showToast("Only owners and admins can upgrade the subscription.", "error" as never);
      return;
    }

    setCheckoutLoading(priceId);
    try {
      const token = await getToken();
      const activeOrgId = typeof window !== "undefined" ? localStorage.getItem("nexus_active_org_id") : "";
      
      const { data, error } = await apiCall<{ checkout_url: string }>(
        "/stripe/create-checkout-session",
        {
          method: "POST",
          body: JSON.stringify({
            price_id: priceId,
            success_url: `${window.location.origin}/dashboard/billing?payment=success`,
            cancel_url: `${window.location.origin}/dashboard/billing?payment=canceled`,
          }),
          headers: {
            "X-Org-ID": activeOrgId || "",
          },
        },
        token ?? undefined
      );

      if (error) {
        showToast(error, "error" as never);
      } else if (data?.checkout_url) {
        showToast("Redirecting to Stripe Checkout...", "success");
        window.location.href = data.checkout_url;
      }
    } catch (err) {
      showToast("Failed to initiate checkout session.", "error" as never);
    } finally {
      setCheckoutLoading(null);
    }
  };

  // ── Portal Redirect ────────────────────────────────────────────────────────
  const handleManageBilling = async () => {
    if (!isOwner && !isAdmin) return;

    setPortalLoading(true);
    try {
      const token = await getToken();
      const activeOrgId = typeof window !== "undefined" ? localStorage.getItem("nexus_active_org_id") : "";
      
      const { data, error } = await apiCall<{ portal_url: string }>(
        "/stripe/create-portal-session",
        {
          method: "POST",
          body: JSON.stringify({
            return_url: `${window.location.origin}/dashboard/billing`,
          }),
          headers: {
            "X-Org-ID": activeOrgId || "",
          },
        },
        token ?? undefined
      );

      if (error) {
        showToast(error, "error" as never);
      } else if (data?.portal_url) {
        showToast("Redirecting to Stripe Billing Portal...", "success");
        window.location.href = data.portal_url;
      }
    } catch (err) {
      showToast("Failed to initiate customer portal session.", "error" as never);
    } finally {
      setPortalLoading(false);
    }
  };

  const formatDate = (iso?: string): string => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Check URL parameters for billing feedback
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("payment") === "success") {
        showToast("Billing state updated successfully!", "success");
        // Clear parameters
        router.replace("/dashboard/billing");
      } else if (params.get("payment") === "canceled") {
        showToast("Stripe checkout was canceled.", "error" as never);
        router.replace("/dashboard/billing");
      }
    }
  }, [router, showToast]);

  // Loading skeleton
  if (loading || !roleLoaded) {
    return (
      <div className="container-app py-12 space-y-8">
        <div className="h-12 w-64 skeleton rounded-2xl" />
        <div className="space-y-4">
          <div className="h-44 skeleton rounded-[2rem]" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-80 skeleton rounded-[2rem]" />
            <div className="h-80 skeleton rounded-[2rem]" />
          </div>
        </div>
      </div>
    );
  }

  const subscription = billingData?.subscription;
  const limits = billingData?.limits;
  const usage = billingData?.usage;
  const currentPlan = limits?.plan || "trial";
  const plans = billingData?.plans || [];

  return (
    <div className="container-app py-12 md:py-20 space-y-10">
      
      {/* ── Page Header ── */}
      <motion.div variants={fadeUp} initial="initial" animate="animate">
        <h1
          className="text-[clamp(2.2rem,6vw,3.5rem)] font-bold tracking-tight text-[var(--text-primary)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Billing &{" "}
          <span className="text-[var(--brand)]">Subscriptions.</span>
        </h1>
        <p className="text-[clamp(0.65rem,1.3vw,0.8125rem)] font-semibold text-[var(--text-muted)] tracking-widest uppercase mt-4 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-[var(--brand)]" />
          Manage subscription plans, limits, and billing details
        </p>
      </motion.div>

      {/* ── Role Restrictions Info ── */}
      {!(isOwner || isAdmin) && (
        <motion.div
          variants={fadeUp}
          initial="initial"
          animate="animate"
          className="p-4 rounded-2xl flex items-center gap-3 text-xs font-semibold"
          style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", color: "#f59e0b" }}
        >
          <Shield className="w-4 h-4" />
          You are viewing this as read-only. Only organization Owners and Admins can manage billing plans.
        </motion.div>
      )}

      {/* ── Usage metrics & Active plan status card ── */}
      {limits && usage && (
        <motion.div
          variants={fadeUp}
          initial="initial"
          animate="animate"
          className="p-8 md:p-10 rounded-[2.5rem] relative overflow-hidden"
          style={{
            background: "var(--card-bg)",
            border: "0.5px solid var(--border-subtle)",
            boxShadow: "var(--card-shadow)",
          }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{
            background: "radial-gradient(circle at 100% 0%, rgba(var(--brand-rgb), 0.05) 0%, transparent 60%)"
          }} />
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
            {/* Active subscription summary */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="px-4 py-1.5 rounded-full text-[clamp(0.55rem,1.1vw,0.6875rem)] font-extrabold uppercase tracking-widest bg-[var(--brand-soft)] border border-[var(--brand-glow)] text-[var(--brand)]">
                  {currentPlan} plan
                </span>
                {subscription?.status && (
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    subscription.status === "active" || subscription.status === "trialing"
                      ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                      : "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                  )}>
                    {subscription.status}
                  </span>
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
                  {limits.org_name} Brain limits
                </h2>
                {subscription?.current_period_end && (
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    {subscription.cancel_at_period_end ? "Subscription ends on " : "Renews on "} 
                    <span className="text-white font-medium">{formatDate(subscription.current_period_end)}</span>
                  </p>
                )}
              </div>

              {/* Portal Session Button */}
              {(isOwner || isAdmin) && subscription?.stripe_customer_id && (
                <button
                  onClick={handleManageBilling}
                  disabled={portalLoading}
                  className="px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border border-[var(--border-subtle)] text-white hover:border-[var(--brand)] hover:bg-[var(--brand-soft)] transition-all disabled:opacity-50 active:scale-[0.98]"
                  style={{ background: "rgba(255,255,255,0.03)" }}
                >
                  {portalLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ExternalLink className="w-3.5 h-3.5" />
                  )}
                  Manage Invoices & Billing
                </button>
              )}
            </div>

            {/* Ingestion & queries progress meters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:w-3/5">
              
              {/* Document limits */}
              <div className="p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-2)]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[var(--text-muted)]">
                    <FileText className="w-4 h-4 text-[var(--brand)]" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Assets</span>
                  </div>
                  <span className="text-xs font-bold text-white">{usage.documents}/{limits.max_documents}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[var(--surface-3)] overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-[var(--brand)] to-[var(--blue-ribbon-500)]" 
                    style={{ width: `${Math.min(100, (usage.documents / limits.max_documents) * 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-[var(--text-muted)]">Vector base document slots</p>
              </div>

              {/* Members limits */}
              <div className="p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-2)]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[var(--text-muted)]">
                    <Users className="w-4 h-4 text-[var(--brand)]" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Seats</span>
                  </div>
                  <span className="text-xs font-bold text-white">{usage.members}/{limits.max_members}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[var(--surface-3)] overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-[var(--brand)] to-[var(--blue-ribbon-500)]" 
                    style={{ width: `${Math.min(100, (usage.members / limits.max_members) * 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-[var(--text-muted)] font-medium">Assigned member accounts</p>
              </div>

              {/* Ingestion query limits */}
              <div className="p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-2)]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[var(--text-muted)]">
                    <Brain className="w-4 h-4 text-[var(--brand)]" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Queries</span>
                  </div>
                  <span className="text-xs font-bold text-white">{usage.queries}/{limits.max_queries_per_month}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[var(--surface-3)] overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-[var(--brand)] to-[var(--blue-ribbon-500)]" 
                    style={{ width: `${Math.min(100, (usage.queries / limits.max_queries_per_month) * 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-[var(--text-muted)]">Neural requests this month</p>
              </div>

            </div>
          </div>
        </motion.div>
      )}

      {/* ── Billing plan tiers grid ── */}
      <motion.div 
        variants={stagger} 
        initial="initial" 
        animate="animate" 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-4"
      >
        {plans.map((plan) => {
          const isActive = currentPlan === plan.id && (plan.id !== "trial" || subscription?.status === "active" || subscription?.status === "trialing");
          const isBusiness = plan.id === "business";

          return (
            <motion.div
              key={plan.id}
              variants={fadeUp}
              className={cn(
                "p-8 md:p-10 rounded-[2.5rem] flex flex-col relative overflow-hidden transition-all duration-500",
                isActive 
                  ? "bg-[var(--card-bg)] border-2 border-[var(--brand)] shadow-[0_0_40px_rgba(var(--brand-rgb),0.1)]" 
                  : "bg-[var(--card-bg)] border border-[var(--border-subtle)] hover:border-[var(--brand)]/50"
              )}
            >
              {isActive && (
                <div className="absolute top-6 right-6 px-4 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-[var(--brand)] text-white">
                  Current Plan
                </div>
              )}
              
              <div className="space-y-2">
                <span className="text-[var(--text-muted)] text-[10px] font-extrabold uppercase tracking-widest">{plan.tagline}</span>
                <h3 className="text-3xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>{plan.name}</h3>
                <p className="text-xs text-[var(--text-muted)]">{plan.description}</p>
              </div>

              <div className="my-8 flex items-baseline gap-1 text-white">
                <span className="text-4xl font-extrabold tracking-tight">{plan.price}</span>
                <span className="text-sm font-semibold text-[var(--text-muted)]">/month</span>
              </div>

              <div className="w-full h-[0.5px] bg-[var(--border-subtle)] mb-8" />

              <ul className="space-y-4 flex-1 mb-8" aria-label={`${plan.name} features`}>
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-3 text-xs text-[var(--text-secondary)]">
                    <CheckCircle2 className="w-4 h-4 text-[var(--brand)] mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgrade(plan.price_id)}
                disabled={checkoutLoading !== null || isActive || !(isOwner || isAdmin)}
                className={cn(
                  "w-full py-4 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 active:scale-[0.98]",
                  isActive 
                    ? "bg-transparent border border-[var(--border-subtle)] text-[var(--text-muted)] cursor-default" 
                    : isBusiness
                      ? "bg-gradient-to-r from-[var(--brand)] to-[var(--blue-ribbon-600)] text-white hover:shadow-[0_8px_24px_rgba(var(--brand-rgb),0.3)] hover:scale-[1.02]"
                      : "bg-[var(--brand)] text-white hover:shadow-[0_8px_24px_rgba(var(--brand-rgb),0.3)] hover:scale-[1.02]"
                )}
              >
                {checkoutLoading === plan.price_id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isActive ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                {isActive ? "Active Plan" : `Upgrade to ${plan.name.replace(" Plan", "")}`}
              </button>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
