"use client";

/**
 * Sign-Up Page — KnowledgeEngine (Nexus AI)
 *
 * 5-step flow:
 *   Step 1  →  Choose path: "Create org" | "Join org"
 *   Step 2  →  Account details (name, email, password, confirm, terms)
 *   Step 3  →  Verify email (6 individual digit inputs)
 *   Step 4  →  Org setup (create: name + slug | join: find org + pick role)
 *   Step 5  →  Creating workspace (animated checklist, auto-runs, then redirect)
 *
 * Rules: hooks only, zero TS errors, AnimatePresence transitions, dark theme.
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ChangeEvent,
  type KeyboardEvent,
  type ClipboardEvent,
} from "react";
import { useSignUp, useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  Users,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  Circle,
  RefreshCw,
  Check,
  X,
} from "lucide-react";
import { toSlug } from "@/lib/slugify";
import { apiCall } from "@/lib/api-client";

// ── Types ──────────────────────────────────────────────────────────────────────

type Mode = "create" | "join" | null;
type Step = 1 | 2 | 3 | 4 | 5;

interface FoundOrg {
  org_id: string;
  org_name: string;
  org_slug: string;
}

interface OrgCheckResponse {
  exists: boolean;
  org_id?: string;
  org_name?: string;
  org_slug?: string;
}

interface OrgAvailableResponse {
  available: boolean;
}

// ── Motion ─────────────────────────────────────────────────────────────────────

const slide: Variants = {
  enter: (dir: number) => ({
    opacity: 0,
    x: dir > 0 ? 40 : -40,
  }),
  center: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.38, ease: [0.19, 1, 0.22, 1] },
  },
  exit: (dir: number) => ({
    opacity: 0,
    x: dir > 0 ? -40 : 40,
    transition: { duration: 0.22 },
  }),
};

// ── Shared styles ──────────────────────────────────────────────────────────────

const inputCls =
  "w-full px-4 py-3.5 rounded-2xl text-sm font-medium text-white bg-[#0a0a0f] " +
  "border border-white/8 placeholder:text-[#94a3b8]/50 outline-none " +
  "focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 transition-all duration-300";

const btnPrimary =
  "w-full py-3.5 rounded-2xl text-sm font-bold tracking-wide bg-[var(--brand)] " +
  "hover:bg-[#5254cc] text-white transition-all duration-300 flex items-center " +
  "justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";

// ── Password strength ──────────────────────────────────────────────────────────

function passwordStrength(pw: string): { level: "weak" | "medium" | "strong"; label: string; color: string } {
  if (pw.length < 8) return { level: "weak", label: "Too short", color: "#ef4444" };
  const hasNum = /\d/.test(pw);
  const hasSym = /[^a-zA-Z0-9]/.test(pw);
  if (hasNum && hasSym) return { level: "strong", label: "Strong", color: "#10b981" };
  return { level: "medium", label: "Fair", color: "#f59e0b" };
}

// ── 6-digit OTP input ──────────────────────────────────────────────────────────

function OtpInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const handleChange = (i: number) => (e: ChangeEvent<HTMLInputElement>) => {
    const digit = e.target.value.replace(/\D/, "").slice(-1);
    const next = [...value];
    next[i] = digit;
    onChange(next);
    if (digit && i < 5) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      const next = [...value];
      if (next[i]) {
        next[i] = "";
        onChange(next);
      } else if (i > 0) {
        refs.current[i - 1]?.focus();
      }
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = Array(6).fill("");
    pasted.split("").forEach((d, i) => { next[i] = d; });
    onChange(next);
    const focusIdx = Math.min(pasted.length, 5);
    refs.current[focusIdx]?.focus();
  };

  return (
    <div className="flex gap-3 justify-center">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          id={`otp-digit-${i}`}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ""}
          onChange={handleChange(i)}
          onKeyDown={handleKeyDown(i)}
          onPaste={handlePaste}
          className="w-12 h-14 rounded-2xl text-center text-xl font-bold text-white bg-[#0a0a0f] border border-white/10 outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 transition-all"
          autoFocus={i === 0}
        />
      ))}
    </div>
  );
}

// ── Checklist item (Step 5) ────────────────────────────────────────────────────

function ChecklistItem({
  label,
  done,
  active,
}: {
  label: string;
  done: boolean;
  active: boolean;
}) {
  return (
    <motion.div
      className="flex items-center gap-4"
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="w-6 h-6 flex items-center justify-center">
        {done ? (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400 }}>
            <CheckCircle2 className="w-6 h-6" style={{ color: "#10b981" }} />
          </motion.div>
        ) : active ? (
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--brand)" }} />
        ) : (
          <Circle className="w-5 h-5" style={{ color: "#94a3b8" }} />
        )}
      </div>
      <span
        className="text-sm font-semibold"
        style={{ color: done ? "#ffffff" : active ? "#c7d2fe" : "#94a3b8" }}
      >
        {label}
      </span>
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function SignUpPage() {
  const { user, isLoaded } = useUser();
  const { signUp } = useSignUp() as any;
  const { setActive } = useClerk();
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [dir, setDir] = useState<number>(1);
  const [mode, setMode] = useState<Mode>(null);

  // Step 2
  const [fullName, setFullName] = useState("");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [terms, setTerms]       = useState(false);
  const [s2Errors, setS2Errors] = useState<Record<string, string>>({});
  const [s2Loading, setS2Loading] = useState(false);

  // Step 3
  const [digits, setDigits]   = useState<string[]>(Array(6).fill(""));
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError]     = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);

  // Step 4 — Create
  const [createOrgName, setCreateOrgName] = useState("");
  const [createOrgSlug, setCreateOrgSlug] = useState("");
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugChecking, setSlugChecking]   = useState(false);
  const [s4CreateError, setS4CreateError] = useState("");

  // Step 4 — Join
  const [joinOrgName, setJoinOrgName] = useState("");
  const [joinOrgSlug, setJoinOrgSlug] = useState("");
  const [foundOrg, setFoundOrg]       = useState<FoundOrg | null>(null);
  const [orgSearching, setOrgSearching] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"member" | "admin">("member");
  const [s4JoinError, setS4JoinError]  = useState("");
  const [joinLoading, setJoinLoading]  = useState(false);

  // Step 5
  const [step5Checks, setStep5Checks] = useState([false, false, false, false]);
  const [step5Error, setStep5Error]   = useState("");
  const [step5Retry, setStep5Retry]   = useState(false);
  const step5Ran                      = useRef(false);

  // Updated descriptive labels for Step 5
  const STEP5_LABELS = [
    "Verifying your account details",
    "Provisioning organization workspace",
    "Configuring security & permissions",
    "Finalizing redirect to dashboard"
  ];

  // ── Helpers ────────────────────────────────────────────────────────────────

  const goTo = useCallback((s: Step, d: number) => {
    setDir(d);
    setStep(s);
  }, []);

  // Resend countdown
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCountdown]);

  // Derive slug for create-org
  useEffect(() => {
    setCreateOrgSlug(toSlug(createOrgName));
    setSlugAvailable(null);
  }, [createOrgName]);

  // Derive slug for join-org
  useEffect(() => {
    setJoinOrgSlug(toSlug(joinOrgName));
    setFoundOrg(null);
    setS4JoinError("");
  }, [joinOrgName]);

  // ── Step 2: Validate + Clerk create ───────────────────────────────────────

  const validateStep2 = (): boolean => {
    const errs: Record<string, string> = {};
    if (fullName.trim().length < 2) errs.fullName = "Full name must be at least 2 characters.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Enter a valid email address.";
    if (password.length < 8) errs.password = "Password must be at least 8 characters.";
    if (password !== confirmPw) errs.confirmPw = "Passwords do not match.";
    if (!terms) errs.terms = "You must accept the Terms and Privacy Policy.";
    setS2Errors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleStep2 = async () => {
    if (!validateStep2() || !signUp) return;
    setS2Loading(true);
    try {
      const nameParts = fullName.trim().split(" ");
      const firstName = nameParts[0];
      const lastName  = nameParts.slice(1).join(" ") || "";

      await signUp.create({
        emailAddress: email,
        password,
        firstName,
        lastName,
      });

      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });
      setResendCountdown(30);
      goTo(3, 1);
    } catch (err: unknown) {
      const clerkErr = err as {
        errors?: Array<{ code: string; longMessage?: string; message?: string }>;
      };
      const code = clerkErr?.errors?.[0]?.code ?? "";
      const msg =
        code === "form_identifier_exists"
          ? "An account with this email already exists."
          : clerkErr?.errors?.[0]?.longMessage ??
            clerkErr?.errors?.[0]?.message ??
            "Failed to create account. Please try again.";
      setS2Errors({ general: msg });
    } finally {
      setS2Loading(false);
    }
  };

  // ── Step 3: Verify email ───────────────────────────────────────────────────

  const handleVerify = async () => {
    if (!signUp) {
      setVerifyError("Session expired. Please refresh and try again.");
      return;
    }
    const code = digits.join("");
    setVerifyLoading(true);
    setVerifyError("");
    try {
      const result: any = await signUp.attemptEmailAddressVerification({ 
        strategy: "email_code",
        code 
      });

      if (result.status !== "complete") {
        setVerifyError("Verification failed. Please try again.");
        setVerifyLoading(false);
        return;
      }

      if (!result.createdSessionId) {
        setVerifyError("No session created. Please try again.");
        setVerifyLoading(false);
        return;
      }

      await setActive({ session: result.createdSessionId });
      await new Promise(resolve => setTimeout(resolve, 1200));

      if (mode === "create") {
        goTo(4, 1);
      } else {
        goTo(4, 1);
      }
    } catch (err: unknown) {
      const clerkErr = err as {
        errors?: Array<{ longMessage?: string; message?: string }>;
      };
      setVerifyError(
        clerkErr?.errors?.[0]?.longMessage ??
        clerkErr?.errors?.[0]?.message ??
        "Invalid code. Please try again."
      );
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleResend = async () => {
    if (!signUp) return;
    setResendLoading(true);
    try {
      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });
      setResendCountdown(30);
      setVerifyError("");
    } catch {
      setVerifyError("Failed to resend code. Try again.");
    } finally {
      setResendLoading(false);
    }
  };

  // ── Step 4 — Create: check slug availability ───────────────────────────────

  const checkSlugAvailability = async () => {
    if (!createOrgSlug) return;
    setSlugChecking(true);
    setSlugAvailable(null);
    // Pass clerk_id so if this user already owns this org (retry), it's still "available"
    const clerkId = user?.id ?? "";
    const { data } = await apiCall<OrgAvailableResponse>(
      `/auth/org-available?slug=${encodeURIComponent(createOrgSlug)}${clerkId ? `&clerk_id=${encodeURIComponent(clerkId)}` : ""}`
    );
    setSlugAvailable(data?.available ?? false);
    setSlugChecking(false);
  };

  // Auto-check slug availability after typing stops (debounce 500ms)
  useEffect(() => {
    if (step !== 4 || mode !== "create") return;
    if (!createOrgSlug) { setSlugAvailable(null); return; }
    const timer = setTimeout(() => {
      checkSlugAvailability();
    }, 500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createOrgSlug, step, mode]);

  const handleCreateContinue = () => {
    if (createOrgName.trim().length < 2 || createOrgName.trim().length > 50) {
      setS4CreateError("Organisation name must be 2–50 characters.");
      return;
    }
    if (slugAvailable === false) {
      setS4CreateError("This name is taken. Try another.");
      return;
    }
    if (slugAvailable === null) {
      setS4CreateError("Please wait for the name availability check.");
      return;
    }
    goTo(5, 1);
  };

  // ── Step 4 — Join: search org ──────────────────────────────────────────────

  const searchOrg = async () => {
    if (!joinOrgSlug) return;
    setOrgSearching(true);
    setS4JoinError("");
    setFoundOrg(null);
    const { data } = await apiCall<OrgCheckResponse>(
      `/auth/org-check?slug=${encodeURIComponent(joinOrgSlug)}`
    );
    setOrgSearching(false);
    if (data?.exists) {
      setFoundOrg({ org_id: data.org_id!, org_name: data.org_name!, org_slug: data.org_slug! });
    } else {
      setS4JoinError("No organisation found.");
    }
  };

  const handleJoinRequest = async () => {
    if (!foundOrg) { setS4JoinError("Please enter a valid organisation name."); return; }
    if (!user) { setS4JoinError("User session lost. Please refresh."); return; }

    setJoinLoading(true);
    setS4JoinError("");
    const { error } = await apiCall("/auth/register-member", {
      method: "POST",
      body: JSON.stringify({
        clerk_id: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? email,
        full_name: user.fullName ?? fullName,
        org_id: foundOrg.org_id,
        requested_role: selectedRole,
      }),
    });
    setJoinLoading(false);

    if (error) {
      setS4JoinError(error);
      return;
    }
    router.push("/pending");
  };

  // ── Step 5: Create workspace ───────────────────────────────────────────────
  const setProgress = (n: number) => {
    setStep5Checks(prev => {
      const next = [...prev];
      for (let i = 0; i < n; i++) next[i] = true;
      return next;
    });
  };

  // Use a separate ref to track if workspace creation is currently in progress
  const step5Running = useRef(false);

  useEffect(() => {
    if (step !== 5) return;
    if (step5Ran.current) return;
    if (step5Running.current) return;
    if (!isLoaded) return;
    if (!user) return;
    if (!createOrgName || !createOrgSlug) return;

    step5Ran.current = true;
    step5Running.current = true;
    runWorkspaceCreation();
  // Only depend on step — user/isLoaded changes should NOT re-trigger
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const runWorkspaceCreation = async () => {
    if (!user) {
      step5Running.current = false;
      return;
    }
    try {
      setStep5Error("");
      setStep5Retry(false);

      // Mark step 1 complete immediately (Account created in Clerk)
      setProgress(1);
      await new Promise(r => setTimeout(r, 400));

      // Step 2: call register-owner — creates org in MongoDB + sets Clerk metadata
      const { data, error } = await apiCall<{ org_id: string; org_name?: string }>("/auth/register-owner", {
        method: "POST",
        body: JSON.stringify({
          clerk_id: user.id,
          email: user.primaryEmailAddress?.emailAddress ?? email,
          full_name: user.fullName ?? fullName,
          org_name: createOrgName,
          org_slug: createOrgSlug,
        }),
      });
      if (error) throw new Error(error);
      
      // Store org info in localStorage immediately so API calls work right away
      if (data?.org_id) {
        localStorage.setItem("nexus_active_org_id", data.org_id);
        if (createOrgName) localStorage.setItem("nexus_active_org_name", createOrgName);
      }
      
      setProgress(2);

      // ─────────────────────────────────────────────────────────────────────────
      // CRITICAL: Clerk's publicMetadata was just updated on the server by
      // register-owner. The local `user` object still has the OLD token.
      // We MUST call user.reload() to force Clerk to re-fetch the session,
      // otherwise publicMetadata.role and publicMetadata.org_id will be empty
      // when the dashboard loads, causing "System User" and 403 API errors.
      // ─────────────────────────────────────────────────────────────────────────
      await user.reload();

      // Wait until publicMetadata.org_id is confirmed present (max 5 seconds)
      const deadline = Date.now() + 5000;
      while (!user.publicMetadata?.org_id && Date.now() < deadline) {
        await new Promise(r => setTimeout(r, 300));
        await user.reload();
      }

      setProgress(3);
      await new Promise(r => setTimeout(r, 500));
      setProgress(4);
      await new Promise(r => setTimeout(r, 400));

      // Redirect to full dashboard — owner gets all tabs visible
      // We use window.location.href to force a full reload so the Clerk JWT is refreshed
      window.location.href = "/dashboard";

    } catch (err) {
      setStep5Error(err instanceof Error ? err.message : "Setup failed");
      setStep5Retry(true);
      step5Ran.current = false; // Allow retry
    } finally {
      step5Running.current = false;
    }
  };

  function delay(ms: number) {
    return new Promise<void>((r) => setTimeout(r, ms));
  }

  // ── Render guard ───────────────────────────────────────────────────────────

  if (!isLoaded) return null;

  const pwStrength = passwordStrength(password);

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "#0a0a0f" }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(99,102,241,0.12) 0%, transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-md">
        <div
          className="rounded-[2.0rem] p-8 md:p-10 overflow-hidden"
          style={{
            background: "#111118",
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
          }}
        >
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)" }}
            >
              <Building2 className="w-4 h-4" style={{ color: "var(--brand)" }} />
            </div>
            <span className="text-white font-bold text-sm tracking-wide">Nexus AI</span>
          </div>

          <AnimatePresence mode="wait" custom={dir}>

            {/* ════════════════════ STEP 1: Choose path ════════════════════ */}
            {step === 1 && (
              <motion.div key="s1" custom={dir} variants={slide} initial="enter" animate="center" exit="exit" className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-white mb-1.5">Get started.</h1>
                  <p className="text-sm" style={{ color: "#94a3b8" }}>
                    How would you like to use Nexus AI?
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    {
                      icon: Building2,
                      label: "Create a new organisation",
                      sub: "You'll be the Owner",
                      m: "create" as Mode,
                      id: "signup-create-org",
                    },
                    {
                      icon: Users,
                      label: "Join an existing organisation",
                      sub: "Request to join",
                      m: "join" as Mode,
                      id: "signup-join-org",
                    },
                  ].map(({ icon: Icon, label, sub, m, id }) => (
                    <button
                      key={m}
                      id={id}
                      onClick={() => {
                        setMode(m);
                        goTo(2, 1);
                      }}
                      className="flex flex-col items-start p-5 rounded-2xl text-left transition-all duration-300 hover:scale-[1.02] hover:border-[var(--brand)]/50 active:scale-[0.98]"
                      style={{
                        background: "#0a0a0f",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                        style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)" }}
                      >
                        <Icon className="w-5 h-5" style={{ color: "var(--brand)" }} />
                      </div>
                      <p className="text-sm font-bold text-white leading-tight mb-1">{label}</p>
                      <p className="text-xs" style={{ color: "#94a3b8" }}>{sub}</p>
                    </button>
                  ))}
                </div>

                <p className="text-center text-sm" style={{ color: "#94a3b8" }}>
                  Already have an account?{" "}
                  <a href="/sign-in" style={{ color: "var(--brand)" }} className="font-semibold hover:underline">
                    Sign in →
                  </a>
                </p>
              </motion.div>
            )}

            {/* ════════════════════ STEP 2: Account details ════════════════ */}
            {step === 2 && (
              <motion.div key="s2" custom={dir} variants={slide} initial="enter" animate="center" exit="exit" className="space-y-5">
                <div className="flex items-center gap-3">
                  <button
                    id="signup-s2-back"
                    onClick={() => goTo(1, -1)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center hover:scale-110 transition-all"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <ArrowLeft className="w-4 h-4 text-white" />
                  </button>
                  <h1 className="text-xl font-bold text-white">Create your account.</h1>
                </div>

                {/* Full name */}
                <div className="space-y-1">
                  <input
                    id="signup-fullname"
                    type="text"
                    placeholder="Full name"
                    value={fullName}
                    onChange={(e) => { setFullName(e.target.value); setS2Errors((p) => ({ ...p, fullName: "" })); }}
                    className={inputCls}
                    autoFocus
                    autoComplete="name"
                  />
                  {s2Errors.fullName && <p className="text-xs px-1" style={{ color: "#f87171" }}>{s2Errors.fullName}</p>}
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <input
                    id="signup-email"
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setS2Errors((p) => ({ ...p, email: "" })); }}
                    className={inputCls}
                    autoComplete="email"
                  />
                  {s2Errors.email && <p className="text-xs px-1" style={{ color: "#f87171" }}>{s2Errors.email}</p>}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <div className="relative">
                    <input
                      id="signup-password"
                      type={showPw ? "text" : "password"}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setS2Errors((p) => ({ ...p, password: "" })); }}
                      className={`${inputCls} pr-11`}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPw((p) => !p)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2"
                      style={{ color: "#94a3b8" }}
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Strength bar */}
                  {password && (
                    <div className="space-y-1">
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: pwStrength.color }}
                          initial={{ width: 0 }}
                          animate={{
                            width:
                              pwStrength.level === "weak"
                                ? "33%"
                                : pwStrength.level === "medium"
                                ? "66%"
                                : "100%",
                          }}
                          transition={{ duration: 0.4 }}
                        />
                      </div>
                      <p className="text-xs px-0.5" style={{ color: pwStrength.color }}>
                        {pwStrength.label}
                      </p>
                    </div>
                  )}
                  {s2Errors.password && <p className="text-xs px-1" style={{ color: "#f87171" }}>{s2Errors.password}</p>}
                </div>

                {/* Confirm password */}
                <div className="space-y-1">
                  <div className="relative">
                    <input
                      id="signup-confirm-password"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Confirm password"
                      value={confirmPw}
                      onChange={(e) => { setConfirmPw(e.target.value); setS2Errors((p) => ({ ...p, confirmPw: "" })); }}
                      className={`${inputCls} pr-11`}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowConfirm((p) => !p)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2"
                      style={{ color: "#94a3b8" }}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {s2Errors.confirmPw && <p className="text-xs px-1" style={{ color: "#f87171" }}>{s2Errors.confirmPw}</p>}
                </div>

                {/* Terms */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div
                    onClick={() => { setTerms((t) => !t); setS2Errors((p) => ({ ...p, terms: "" })); }}
                    className="flex-shrink-0 w-5 h-5 rounded-md mt-0.5 flex items-center justify-center transition-all"
                    style={{
                      background: terms ? "var(--brand)" : "transparent",
                      border: `1.5px solid ${terms ? "var(--brand)" : "rgba(255,255,255,0.2)"}`,
                    }}
                  >
                    {terms && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-xs leading-relaxed" style={{ color: "#94a3b8" }}>
                    I agree to the{" "}
                    <a href="#" style={{ color: "var(--brand)" }} className="underline">Terms</a>
                    {" "}and{" "}
                    <a href="#" style={{ color: "var(--brand)" }} className="underline">Privacy Policy</a>
                  </span>
                </label>
                {s2Errors.terms && <p className="text-xs px-1" style={{ color: "#f87171" }}>{s2Errors.terms}</p>}

                {/* Clerk CAPTCHA placeholder for bot protection */}
                <div id="clerk-captcha" data-cl-theme="dark" />

                {s2Errors.general && (
                  <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                    {s2Errors.general}
                  </div>
                )}

                <button id="signup-s2-continue" onClick={handleStep2} disabled={s2Loading} className={btnPrimary}>
                  {s2Loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {s2Loading ? "Creating account…" : "Continue"}
                </button>
              </motion.div>
            )}

            {/* ════════════════════ STEP 3: Verify email ════════════════════ */}
            {step === 3 && (
              <motion.div key="s3" custom={dir} variants={slide} initial="enter" animate="center" exit="exit" className="space-y-6">
                <div className="flex items-center gap-3">
                  <button
                    id="signup-s3-back"
                    onClick={() => goTo(2, -1)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center hover:scale-110 transition-all"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <ArrowLeft className="w-4 h-4 text-white" />
                  </button>
                </div>

                <div className="text-center space-y-2">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)" }}
                  >
                    <span className="text-3xl">✉️</span>
                  </div>
                  <h1 className="text-2xl font-bold text-white">Check your inbox.</h1>
                  <p className="text-sm" style={{ color: "#94a3b8" }}>
                    6-digit code sent to{" "}
                    <span className="font-semibold text-white">{email}</span>
                  </p>
                </div>

                <OtpInput value={digits} onChange={setDigits} />

                {verifyError && (
                  <div className="rounded-xl px-4 py-3 text-sm text-center" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                    {verifyError}
                  </div>
                )}

                <button
                  id="signup-verify"
                  onClick={handleVerify}
                  disabled={digits.join("").length !== 6 || verifyLoading}
                  className={btnPrimary}
                >
                  {verifyLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {verifyLoading ? "Verifying…" : "Verify Email"}
                </button>

                <div className="text-center">
                  {resendCountdown > 0 ? (
                    <p className="text-xs" style={{ color: "#94a3b8" }}>
                      Resend code in <span className="font-bold text-white">{resendCountdown}s</span>
                    </p>
                  ) : (
                    <button
                      id="signup-resend"
                      onClick={handleResend}
                      disabled={resendLoading}
                      className="text-xs font-semibold hover:underline disabled:opacity-50 flex items-center gap-1.5 mx-auto"
                      style={{ color: "var(--brand)" }}
                    >
                      {resendLoading && <RefreshCw className="w-3 h-3 animate-spin" />}
                      Resend code
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* ════════════════════ STEP 4: Org setup ════════════════════ */}
            {step === 4 && mode === "create" && (
              <motion.div key="s4-create" custom={dir} variants={slide} initial="enter" animate="center" exit="exit" className="space-y-5">
                <div>
                  <h1 className="text-2xl font-bold text-white mb-1.5">Name your organisation.</h1>
                  <p className="text-sm" style={{ color: "#94a3b8" }}>
                    This will be your workspace identifier.
                  </p>
                </div>

                <div className="space-y-2">
                  <input
                    id="signup-org-name-create"
                    type="text"
                    placeholder="Organisation name"
                    value={createOrgName}
                    onChange={(e) => { setCreateOrgName(e.target.value); setS4CreateError(""); }}
                    onBlur={checkSlugAvailability}
                    className={inputCls}
                    autoFocus
                    maxLength={50}
                  />

                  {createOrgSlug && (
                    <p className="text-xs px-1 flex items-center gap-2" style={{ color: "#94a3b8" }}>
                      Workspace ID:{" "}
                      <span className="font-bold" style={{ color: "var(--brand)" }}>{createOrgSlug}</span>
                      {slugChecking && <Loader2 className="w-3 h-3 animate-spin" style={{ color: "#94a3b8" }} />}
                      {!slugChecking && slugAvailable === true && <Check className="w-3.5 h-3.5" style={{ color: "#10b981" }} />}
                      {!slugChecking && slugAvailable === false && <X className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />}
                    </p>
                  )}

                  {!slugChecking && slugAvailable === false && (
                    <p className="text-xs px-1" style={{ color: "#f87171" }}>This name is taken. Try another.</p>
                  )}
                  {!slugChecking && slugAvailable === true && (
                    <p className="text-xs px-1" style={{ color: "#10b981" }}>Name is available.</p>
                  )}
                </div>

                {s4CreateError && (
                  <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                    {s4CreateError}
                  </div>
                )}

                <button id="signup-org-create-continue" onClick={handleCreateContinue} className={btnPrimary}>
                  Continue
                </button>
              </motion.div>
            )}

            {step === 4 && mode === "join" && (
              <motion.div key="s4-join" custom={dir} variants={slide} initial="enter" animate="center" exit="exit" className="space-y-5">
                <div className="flex items-center gap-3">
                  <button
                    id="signup-s4-join-back"
                    onClick={() => goTo(2, -1)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center hover:scale-110 transition-all"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <ArrowLeft className="w-4 h-4 text-white" />
                  </button>
                  <h1 className="text-xl font-bold text-white">Which organisation?</h1>
                </div>

                <div className="space-y-2">
                  <input
                    id="signup-join-org-name"
                    type="text"
                    placeholder="Organisation name"
                    value={joinOrgName}
                    onChange={(e) => setJoinOrgName(e.target.value)}
                    onBlur={searchOrg}
                    className={inputCls}
                    autoFocus
                  />
                  {joinOrgSlug && (
                    <p className="text-xs px-1" style={{ color: "#94a3b8" }}>
                      Workspace ID:{" "}
                      <span className="font-bold" style={{ color: "var(--brand)" }}>{joinOrgSlug}</span>
                      {orgSearching && <Loader2 className="w-3 h-3 animate-spin inline ml-2" style={{ color: "#94a3b8" }} />}
                    </p>
                  )}

                  <AnimatePresence>
                    {foundOrg && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-xs px-1 flex items-center gap-1.5 font-semibold"
                        style={{ color: "#10b981" }}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Found: {foundOrg.org_name}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  {s4JoinError && !foundOrg && (
                    <p className="text-xs px-1" style={{ color: "#f87171" }}>{s4JoinError}</p>
                  )}
                </div>

                {/* Role selector */}
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-widest px-1" style={{ color: "#94a3b8" }}>Request role</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(["member", "admin"] as const).map((r) => (
                      <button
                        key={r}
                        id={`signup-role-${r}`}
                        onClick={() => setSelectedRole(r)}
                        className="py-3 px-4 rounded-xl text-sm font-semibold text-left transition-all"
                        style={{
                          background: selectedRole === r ? "rgba(99,102,241,0.15)" : "#0a0a0f",
                          border: `1.5px solid ${selectedRole === r ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.08)"}`,
                          color: selectedRole === r ? "#c7d2fe" : "#94a3b8",
                        }}
                      >
                        <p className="font-bold capitalize">{r}</p>
                        <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>
                          {r === "member" ? "Standard access" : "Requires Owner approval"}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {s4JoinError && foundOrg && (
                  <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                    {s4JoinError}
                  </div>
                )}

                <button
                  id="signup-join-request"
                  onClick={handleJoinRequest}
                  disabled={!foundOrg || joinLoading}
                  className={btnPrimary}
                >
                  {joinLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {joinLoading ? "Submitting request…" : "Request to Join"}
                </button>
              </motion.div>
            )}

            {/* ════════════════════ STEP 5: Creating workspace ══════════════ */}
            {step === 5 && (
              <motion.div key="s5" custom={dir} variants={slide} initial="enter" animate="center" exit="exit" className="space-y-8">
                <div>
                  <h1 className="text-2xl font-bold text-white mb-1.5">Setting up your workspace.</h1>
                  <p className="text-sm" style={{ color: "#94a3b8" }}>
                    Just a moment while we configure everything…
                  </p>
                </div>

                <div className="space-y-5 py-2">
                  {STEP5_LABELS.map((label, i) => (
                    <ChecklistItem
                      key={i}
                      label={label}
                      done={step5Checks[i]}
                      active={!step5Checks[i] && (i === 0 || step5Checks[i - 1])}
                    />
                  ))}
                </div>

                {step5Error && (
                  <div className="space-y-3">
                    <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                      {step5Error}
                    </div>
                    {step5Retry && (
                      <button
                        id="signup-step5-retry"
                        onClick={() => {
                          step5Ran.current = false;
                          setStep5Retry(false);
                          runWorkspaceCreation();
                        }}
                        className="w-full py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:opacity-80"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                      >
                        <RefreshCw className="w-4 h-4" /> Retry
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
