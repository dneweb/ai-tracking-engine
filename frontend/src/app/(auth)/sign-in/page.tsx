"use client";

/**
 * Sign-In Page — Memora (Memora)
 *
 * 3-step flow:
 *   Step 1  →  Org name lookup
 *   Step 2  →  Email + password (Clerk)
 *   Step 3  →  Success screen (1s) → role-based redirect
 *
 * Rules:
 *  - No Clerk prebuilt components — hooks only
 *  - Zero TS errors, all types explicit
 *  - Dark theme matches globals.css tokens exactly
 *  - AnimatePresence for step transitions
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useSignIn, useClerk, useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Eye, EyeOff, ArrowLeft, CheckCircle, Loader2, Building2 } from "lucide-react";
import { toSlug } from "@/lib/slugify";
import { apiCall } from "@/lib/api-client";
import { getRedirectForRole } from "@/lib/roleRedirects";

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | "2fa" | 3;

interface OrgData {
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

interface ValidateSigninResponse {
  success: boolean;
  org_id: string;
  org_name: string;
  role: string;
  redirect_to: string;
}

// ── Motion variants ────────────────────────────────────────────────────────────

const slideVariants: Variants = {
  enter: (dir: number) => ({
    opacity: 0,
    x: dir > 0 ? 40 : -40,
  }),
  center: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: [0.19, 1, 0.22, 1] },
  },
  exit: (dir: number) => ({
    opacity: 0,
    x: dir > 0 ? -40 : 40,
    transition: { duration: 0.25, ease: [0.19, 1, 0.22, 1] },
  }),
};

// ── Shared input style ─────────────────────────────────────────────────────────

const inputCls =
  "w-full px-4 py-3.5 rounded-2xl text-sm font-medium text-white bg-[#111118] " +
  "border border-white/8 placeholder:text-[#94a3b8]/50 outline-none " +
  "focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 transition-all duration-300";

const btnCls =
  "w-full py-3.5 rounded-2xl text-sm font-bold tracking-wide bg-[var(--brand)] " +
  "hover:bg-[#5254cc] text-white transition-all duration-300 flex items-center " +
  "justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";

// ── Component ─────────────────────────────────────────────────────────────────

export default function SignInPage() {
  const { signIn } = useSignIn() as any;
  const clerk = useClerk();
  const { setActive, signOut, loaded: isLoaded } = clerk;
  const { userId } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [direction, setDirection] = useState<number>(1);

  // Step 1 state
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [orgData, setOrgData] = useState<OrgData | null>(null);
  const [step1Error, setStep1Error] = useState("");
  const [step1Loading, setStep1Loading] = useState(false);

  // Step 2 state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [step2Error, setStep2Error] = useState("");
  const [step2Loading, setStep2Loading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  // Second factor (Client Trust / MFA) state
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);

  // Reset password state
  const [resetCode, setResetCode] = useState("");
  const [newResetPassword, setNewResetPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);

  // Derive slug from org name
  useEffect(() => {
    setOrgSlug(toSlug(orgName));
  }, [orgName]);

  // Auto-focus email when entering step 2
  useEffect(() => {
    if (step === 2) {
      setTimeout(() => emailRef.current?.focus(), 350);
    }
  }, [step]);

  const goTo = useCallback((next: Step, dir: number) => {
    setDirection(dir);
    setStep(next);
  }, []);

  // ── Step 1: Org lookup ─────────────────────────────────────────────────────

  const handleOrgLookup = async () => {
    if (!orgSlug) {
      setStep1Error("Please enter your organisation name.");
      return;
    }
    setStep1Loading(true);
    setStep1Error("");

    const { data, error } = await apiCall<OrgCheckResponse>(
      `/auth/org-check?slug=${encodeURIComponent(orgSlug)}`
    );

    setStep1Loading(false);

    if (error) {
      setStep1Error(error);
      return;
    }

    if (!data?.exists) {
      setStep1Error("No organisation found. Check the name or sign up.");
      return;
    }

    setOrgData({
      org_id: data.org_id!,
      org_name: data.org_name!,
      org_slug: data.org_slug!,
    });
    goTo(2, 1);
  };

  // ── Step 2: Clerk sign-in ──────────────────────────────────────────────────

  const handleSignIn = async () => {
    if (!email || !password) {
      setStep2Error("Please enter your email and password.");
      return;
    }
    if (!orgData) {
      setStep2Error("Organisation context lost. Please go back.");
      return;
    }
    if (!signIn) return;

    setStep2Loading(true);
    setStep2Error("");

    try {
      // Get the SignIn resource from clerk.client
      const clientSignIn = (clerk as any).client.signIn;

      // NEW LOGIC: Check if existing sign-in supports password strategy before reusing
      // This avoids conflict when coming back from a "Forgot password" flow (which uses reset_password_email_code)
      const isExistingSameEmail = clientSignIn?.identifier === email;
      const isExistingNeedsFirstFactor = clientSignIn?.status === "needs_first_factor";
      const supportsPassword = clientSignIn?.supportedFirstFactors?.some(
        (factor: any) => factor.strategy === "password"
      );

      let signInAttempt;
      if (isExistingSameEmail && isExistingNeedsFirstFactor && supportsPassword) {
        // Safe to reuse - supports password
        console.log("[Sign-in] Reusing existing sign-in (supports password)");
        signInAttempt = clientSignIn;
      } else {
        // Create fresh - incompatible or from reset_password flow
        console.log("[Sign-in] Creating fresh sign-in (existing incompatible or none)");
        signInAttempt = await clientSignIn.create({
          identifier: email,
        });
      }

      console.log("[Sign-in] Auth result - status:", signInAttempt.status, "identifier:", signInAttempt.identifier);

      // Check status and proceed accordingly
      let result: any;

      if (signInAttempt.status === "needs_first_factor") {
        // Status is correct - attempt password authentication
        console.log("[Sign-in] Attempting first factor with password strategy");
        result = await signInAttempt.attemptFirstFactor({
          strategy: "password",
          password,
        });
        console.log("[Sign-in] First factor result - status:", result.status);
      } else {
        // Different status (e.g. complete, needs_second_factor, etc.) - use as-is
        console.log("[Sign-in] Skipping first factor - using current status:", signInAttempt.status);
        result = signInAttempt;
      }

      if (result.status === "complete") {
        // Activate Clerk session
        const sessionId = result.createdSessionId;
        await setActive({ session: sessionId });

        // Get user ID - use client.sessions as it is populated immediately
        let clerkUserId = "";

        // Polling loop for robust extraction
        const deadline = Date.now() + 3000;
        while (!clerkUserId && Date.now() < deadline) {
          const activeSession = (clerk as any).client?.sessions?.find((s: any) => s.id === sessionId);
          clerkUserId = activeSession?.user?.id || (clerk as any).user?.id || "";
          if (!clerkUserId) {
            await new Promise(r => setTimeout(r, 200));
          }
        }

        if (!clerkUserId) {
          setStep2Error(
            "Session created but user ID not found. " +
            "Please refresh and try again."
          );
          setStep2Loading(false);
          return;
        }

        // Validate org membership
        const {
          data: vData,
          error: vError,
          status: vStatus
        } = await apiCall<ValidateSigninResponse>(
          "/auth/validate-signin",
          {
            method: "POST",
            body: JSON.stringify({
              clerk_id: clerkUserId,
              org_slug: orgData.org_slug,
            }),
          }
        );

        if (vError) {
          if (vStatus === 403 || vStatus === 404) {
            try { await signOut(); } catch { }
          }

          if (vStatus === 403 && vError.includes("pending")) {
            router.push("/pending");
            return;
          }
          if (vStatus === 403 && vError.includes("rejected")) {
            setStep2Error(
              "Your request was rejected. Contact your admin."
            );
          } else if (vStatus === 403) {
            setStep2Error(
              "You are not authorised for this organisation."
            );
          } else if (vStatus === 404) {
            setStep2Error(
              "Organisation not found. Contact support."
            );
          } else {
            setStep2Error(
              vError || "Validation failed. Please try again."
            );
          }
          setStep2Loading(false);
          return;
        }

        if (vData && vData.redirect_to === "/pending") {
          router.push("/pending");
          return;
        }

        if (vData?.org_id) {
          localStorage.setItem(
            "nexus_active_org_id", vData.org_id
          );
          localStorage.setItem(
            "nexus_active_org_name", vData.org_name || ""
          );
          localStorage.setItem(
            "nexus_active_org_slug", orgData.org_slug
          );
        }

        goTo(3, 1);
        setTimeout(() => {
          window.location.href = getRedirectForRole(
            vData?.role ?? "user"
          );
        }, 1200);

      } else if (
        result.status === "needs_second_factor" ||
        result.status === "needs_client_trust"
      ) {
        // Client Trust or MFA — send email verification code
        console.log("[Sign-in] Second factor required, status:", result.status);
        console.log("[Sign-in] Supported second factors:", result.supportedSecondFactors);
        try {
          const emailFactor = result.supportedSecondFactors?.find(
            (f: any) => f.strategy === "email_code"
          );
          if (emailFactor) {
            await clientSignIn.prepareSecondFactor({
              strategy: "email_code",
              emailAddressId: emailFactor.emailAddressId,
            });
          } else {
            // Fallback: try without emailAddressId
            await clientSignIn.prepareSecondFactor({ strategy: "email_code" });
          }
          // Transition to OTP step
          setPendingSessionId(null); // will get sessionId after 2FA completes
          goTo("2fa", 1);
        } catch (sfErr: any) {
          console.error("[Sign-in] prepareSecondFactor error:", sfErr);
          setStep2Error(
            "Verification required but failed to send code. " +
            (sfErr?.errors?.[0]?.longMessage || sfErr?.message || "Please try again.")
          );
        }
        setStep2Loading(false);
      } else if (result.status === "needs_new_password") {
        setStep2Error("A new password is required.");
        setStep2Loading(false);
      } else {
        // Log actual status to console for debugging
        console.error(
          "[sign-in] Unexpected status:", result.status,
          "Full result:", result
        );
        setStep2Error(
          `Unexpected sign-in status: ${result.status}. ` +
          "Please try again."
        );
        setStep2Loading(false);
      }
    } catch (err: unknown) {
      setStep2Loading(false);
      const clerkErr = err as {
        errors?: Array<{ code: string; longMessage?: string; message?: string }>;
      };
      console.error("[handleSignIn Error]:", err);
      const code = clerkErr?.errors?.[0]?.code ?? "";
      const msg =
        code === "form_password_incorrect"
          ? "Incorrect password."
          : code === "form_identifier_not_found"
            ? "No account with this email."
            : code === "too_many_requests"
              ? "Too many attempts. Try later."
              : clerkErr?.errors?.[0]?.longMessage ??
              clerkErr?.errors?.[0]?.message ??
              "Sign in failed. Please try again.";
      setStep2Error(msg);
    }
  };

  // ── Second factor verification (Client Trust / MFA email code) ─────────────

  const handleVerifySecondFactor = async () => {
    if (!verifyCode || verifyCode.length < 6) {
      setVerifyError("Enter the 6-digit code from your email.");
      return;
    }
    if (!orgData) {
      setVerifyError("Organisation context lost. Please go back.");
      return;
    }

    setVerifyLoading(true);
    setVerifyError("");

    try {
      const clientSignIn = (clerk as any).client.signIn;
      const result = await clientSignIn.attemptSecondFactor({
        strategy: "email_code",
        code: verifyCode.trim(),
      });

      console.log("[Sign-in] 2FA result - status:", result.status);

      if (result.status === "complete") {
        // Activate Clerk session
        const sessionId = result.createdSessionId;
        await setActive({ session: sessionId });

        // Get user ID with polling
        let clerkUserId = "";
        const deadline = Date.now() + 3000;
        while (!clerkUserId && Date.now() < deadline) {
          const activeSession = (clerk as any).client?.sessions?.find(
            (s: any) => s.id === sessionId
          );
          clerkUserId = activeSession?.user?.id || (clerk as any).user?.id || "";
          if (!clerkUserId) {
            await new Promise((r) => setTimeout(r, 200));
          }
        }

        if (!clerkUserId) {
          setVerifyError("Session created but user ID not found. Please refresh.");
          setVerifyLoading(false);
          return;
        }

        // Validate org membership
        const { data: vData, error: vError, status: vStatus } =
          await apiCall<ValidateSigninResponse>("/auth/validate-signin", {
            method: "POST",
            body: JSON.stringify({
              clerk_id: clerkUserId,
              org_slug: orgData.org_slug,
            }),
          });

        if (vError) {
          if (vStatus === 403 || vStatus === 404) {
            try { await signOut(); } catch {}
          }
          if (vStatus === 403 && vError.includes("pending")) {
            router.push("/pending");
            return;
          }
          if (vStatus === 403 && vError.includes("rejected")) {
            setVerifyError("Your request was rejected. Contact your admin.");
          } else if (vStatus === 403) {
            setVerifyError("You are not authorised for this organisation.");
          } else if (vStatus === 404) {
            setVerifyError("Organisation not found. Contact support.");
          } else {
            setVerifyError(vError || "Validation failed. Please try again.");
          }
          setVerifyLoading(false);
          return;
        }

        if (vData && vData.redirect_to === "/pending") {
          router.push("/pending");
          return;
        }

        if (vData?.org_id) {
          localStorage.setItem("nexus_active_org_id", vData.org_id);
          localStorage.setItem("nexus_active_org_name", vData.org_name || "");
          localStorage.setItem("nexus_active_org_slug", orgData.org_slug);
        }

        goTo(3, 1);
        setTimeout(() => {
          window.location.href = getRedirectForRole(vData?.role ?? "user");
        }, 1200);
      } else {
        console.error("[Sign-in] 2FA unexpected status:", result.status);
        setVerifyError(`Unexpected status: ${result.status}. Please try again.`);
        setVerifyLoading(false);
      }
    } catch (err: any) {
      console.error("[handleVerifySecondFactor Error]:", err);
      const code = err?.errors?.[0]?.code ?? "";
      const msg =
        code === "form_code_incorrect"
          ? "Incorrect code. Please try again."
          : err?.errors?.[0]?.longMessage ??
            err?.errors?.[0]?.message ??
            "Verification failed. Please try again.";
      setVerifyError(msg);
      setVerifyLoading(false);
    }
  };

  const handleResendCode = async () => {
    setVerifyError("");
    try {
      const clientSignIn = (clerk as any).client.signIn;
      await clientSignIn.prepareSecondFactor({ strategy: "email_code" });
      setVerifyError("✓ New code sent to your email.");
    } catch (err: any) {
      console.error("[Resend code error]:", err);
      setVerifyError(
        err?.errors?.[0]?.longMessage || "Failed to resend code. Please try again."
      );
    }
  };

  // ── Forgot password ────────────────────────────────────────────────────────

  const handleForgotPassword = async () => {
    if (!email) {
      setStep2Error("Enter your email address first, then click Forgot password.");
      return;
    }
    if (!signIn) return;
    setForgotLoading(true);
    setStep2Error("");
    try {
      // Create password reset sign-in using clerk.client.signIn
      // This will overwrite any existing sign-in state
      await (clerk.client.signIn as any).create({
        strategy: "reset_password_email_code",
        identifier: email
      });

      setForgotSent(true);
      setResetSuccess(false);
    } catch (err: any) {
      console.error("Forgot Password Error:", err);
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || "Failed to send reset email. Check the address and try again.";
      setStep2Error(msg);
    } finally {
      setForgotLoading(false);
    }
  };

  // ── Reset password (verify code + set new password) ─────────────────────────

  const handleResetPassword = async () => {
    if (!resetCode.trim() || resetCode.trim().length < 6) {
      setResetError("Enter the 6-digit code from your email.");
      return;
    }
    if (!newResetPassword || newResetPassword.length < 8) {
      setResetError("New password must be at least 8 characters.");
      return;
    }
    if (!orgData) {
      setResetError("Organisation context lost. Please restart the sign-in flow.");
      return;
    }
    if (!signIn) return;
    setResetLoading(true);
    setResetError("");
    try {
      // Use clerk.client.signIn to verify code AND set password in one atomic step
      const result = await (clerk.client.signIn as any).attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: resetCode.trim(),
        password: newResetPassword,
      });

      if (result.status === "complete") {
        // Activate Clerk session
        const sessionId = result.createdSessionId;
        await setActive({ session: sessionId });

        // Get user ID - use client.sessions as it is populated immediately
        let clerkUserId = "";

        // Polling loop for robust extraction
        const deadline = Date.now() + 3000;
        while (!clerkUserId && Date.now() < deadline) {
          const activeSession = (clerk as any).client?.sessions?.find((s: any) => s.id === sessionId);
          clerkUserId = activeSession?.user?.id || (clerk as any).user?.id || "";
          if (!clerkUserId) {
            await new Promise(r => setTimeout(r, 200));
          }
        }

        if (!clerkUserId) {
          setResetError(
            "Session created but user ID not found. " +
            "Please refresh and try again."
          );
          setResetLoading(false);
          return;
        }

        // Validate org membership
        const {
          data: vData,
          error: vError,
          status: vStatus
        } = await apiCall<ValidateSigninResponse>(
          "/auth/validate-signin",
          {
            method: "POST",
            body: JSON.stringify({
              clerk_id: clerkUserId,
              org_slug: orgData.org_slug,
            }),
          }
        );

        if (vError) {
          if (vStatus === 403 || vStatus === 404) {
            try { await signOut(); } catch { }
          }

          if (vStatus === 403 && vError.includes("pending")) {
            router.push("/pending");
            return;
          }
          if (vStatus === 403 && vError.includes("rejected")) {
            setResetError("Your request was rejected. Contact your admin.");
          } else if (vStatus === 403) {
            setResetError("You are not authorised for this organisation.");
          } else if (vStatus === 404) {
            setResetError("Organisation not found. Contact support.");
          } else {
            setResetError(vError || "Validation failed. Please try again.");
          }
          setResetLoading(false);
          return;
        }

        if (vData && vData.redirect_to === "/pending") {
          router.push("/pending");
          return;
        }

        if (vData?.org_id) {
          localStorage.setItem("nexus_active_org_id", vData.org_id);
          localStorage.setItem("nexus_active_org_name", vData.org_name || "");
          localStorage.setItem("nexus_active_org_slug", orgData.org_slug);
        }

        // Clear all flow state
        setForgotSent(false);
        setResetCode("");
        setNewResetPassword("");
        setResetError("");
        setPassword("");
        setResetSuccess(true);

        goTo(3, 1);
        setTimeout(() => {
          window.location.href = getRedirectForRole(vData?.role ?? "user");
        }, 1200);

      } else {
        throw new Error(`Status: ${result.status}. Please try again.`);
      }
    } catch (err: any) {
      console.error("Password Reset Error:", err);
      const msg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        err?.message ||
        "Password reset failed. Please try again.";
      setResetError(msg);
    } finally {
      setResetLoading(false);
    }
  };

  if (!isLoaded) return null;

  if (userId) {
    const handleGoToDashboard = () => {
      window.location.href = "/dashboard";
    };

    const handleSignOut = async () => {
      try {
        await signOut();
        localStorage.removeItem("nexus_active_org_id");
        localStorage.removeItem("nexus_active_org_name");
        localStorage.removeItem("nexus_active_org_slug");
        window.location.href = "/sign-in";
      } catch (err) {
        console.error("Sign out error:", err);
      }
    };

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
            <div className="flex items-center gap-3 mb-10">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[var(--brand-soft)] border border-[var(--brand-glow)] overflow-hidden p-1.5 shadow-sm">
                <img 
                  src="/logo.svg" 
                  alt="Memora Logo" 
                  className="w-full h-full object-contain brightness-0 invert" 
                />
              </div>
              <span className="text-white font-bold text-sm tracking-wide">Memora</span>
            </div>

            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-white mb-1.5">Already signed in</h1>
                <p style={{ color: "#94a3b8" }} className="text-sm">
                  You are currently signed in as <span className="font-semibold text-white">{user?.primaryEmailAddress?.emailAddress || "your account"}</span>.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleGoToDashboard}
                  className="w-full py-3.5 rounded-2xl text-sm font-bold tracking-wide bg-[var(--brand)] hover:bg-[#5254cc] text-white transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  Go to Dashboard
                </button>

                <button
                  onClick={handleSignOut}
                  className="w-full py-3.5 rounded-2xl text-sm font-bold tracking-wide bg-white/5 hover:bg-white/10 border border-white/8 text-white transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

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
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(99,102,241,0.12) 0%, transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Card */}
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
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[var(--brand-soft)] border border-[var(--brand-glow)] overflow-hidden p-1.5 shadow-sm">
              <img 
                src="/logo.svg" 
                alt="Memora Logo" 
                className="w-full h-full object-contain brightness-0 invert" 
              />
            </div>
            <span className="text-white font-bold text-sm tracking-wide">Memora</span>
          </div>

          <AnimatePresence mode="wait" custom={direction}>
            {/* ── STEP 1: Org Lookup ── */}
            {step === 1 && (
              <motion.div
                key="step1"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-6"
              >
                <div>
                  <h1 className="text-2xl font-bold text-white mb-1.5">Welcome back.</h1>
                  <p style={{ color: "#94a3b8" }} className="text-sm">
                    Enter your organisation name to continue.
                  </p>
                </div>

                <div className="space-y-2">
                  <input
                    id="sign-in-org-name"
                    type="text"
                    placeholder="Organisation name"
                    value={orgName}
                    onChange={(e) => { setOrgName(e.target.value); setStep1Error(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleOrgLookup()}
                    className={inputCls}
                    autoFocus
                    autoComplete="organization"
                  />
                  {orgSlug && (
                    <p className="text-xs px-1" style={{ color: "#94a3b8" }}>
                      Workspace:{" "}
                      <span className="font-bold" style={{ color: "var(--brand)" }}>
                        {orgSlug}
                      </span>
                    </p>
                  )}
                </div>

                {step1Error && (
                  <div
                    className="rounded-xl px-4 py-3 text-sm"
                    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}
                  >
                    {step1Error}{" "}
                    {step1Error.includes("sign up") && (
                      <a href="/sign-up" style={{ color: "var(--brand)" }} className="underline">
                        Sign up
                      </a>
                    )}
                  </div>
                )}

                <button
                  id="sign-in-org-continue"
                  onClick={handleOrgLookup}
                  disabled={!orgSlug || step1Loading}
                  className={btnCls}
                >
                  {step1Loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {step1Loading ? "Looking up…" : "Continue"}
                </button>

                <p className="text-center text-sm" style={{ color: "#94a3b8" }}>
                  New here?{" "}
                  <a href="/sign-up" style={{ color: "var(--brand)" }} className="font-semibold hover:underline">
                    Create an organisation →
                  </a>
                </p>
              </motion.div>
            )}

            {/* ── STEP 2: Email + Password ── */}
            {step === 2 && (
              <motion.div
                key="step2"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-6"
              >
                {/* Back + org label */}
                <div className="flex items-center gap-3">
                  <button
                    id="sign-in-back"
                    onClick={() => {
                      setStep2Error("");
                      setForgotSent(false);
                      setResetSuccess(false);
                      setResetCode("");
                      setNewResetPassword("");
                      goTo(1, -1);
                    }}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <ArrowLeft className="w-4 h-4 text-white" />
                  </button>
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#94a3b8" }}>
                    Signing in to{" "}
                    <span className="text-white">{orgData?.org_name}</span>
                  </span>
                </div>

                <div>
                  <h1 className="text-2xl font-bold text-white mb-1.5">Enter your credentials.</h1>
                </div>

                <div className="space-y-3">
                  <input
                    id="sign-in-email"
                    ref={emailRef}
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setStep2Error(""); setForgotSent(false); }}
                    onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                    className={inputCls}
                    autoComplete="email"
                  />

                  {/* Password with toggle */}
                  <div className="relative">
                    <input
                      id="sign-in-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setStep2Error(""); }}
                      onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                      className={`${inputCls} pr-11`}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-80"
                      style={{ color: "#94a3b8" }}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Forgot password / Reset form */}
                {resetSuccess ? (
                  <div
                    className="rounded-xl px-4 py-3 text-sm text-center"
                    style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981" }}
                  >
                    ✓ Password reset successful! Sign in with your new password.
                  </div>
                ) : forgotSent ? (
                  <div className="space-y-3">
                    <p className="text-xs text-center" style={{ color: "#10b981" }}>
                      ✓ Reset code sent to your email.
                    </p>

                    {/* Reset code input */}
                    <input
                      id="sign-in-reset-code"
                      type="text"
                      inputMode="numeric"
                      placeholder="6-digit code"
                      maxLength={6}
                      value={resetCode}
                      onChange={(e) => { setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setResetError(""); }}
                      className={inputCls}
                      autoFocus
                    />

                    {/* New password input */}
                    <div className="relative">
                      <input
                        id="sign-in-new-password"
                        type={showNewPassword ? "text" : "password"}
                        placeholder="New password (min 8 characters)"
                        value={newResetPassword}
                        onChange={(e) => { setNewResetPassword(e.target.value); setResetError(""); }}
                        onKeyDown={(e) => e.key === "Enter" && handleResetPassword()}
                        className={`${inputCls} pr-11`}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowNewPassword((p) => !p)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-80"
                        style={{ color: "#94a3b8" }}
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Reset error */}
                    {resetError && (
                      <div
                        className="rounded-xl px-4 py-3 text-sm"
                        style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}
                      >
                        {resetError}
                      </div>
                    )}

                    {/* Submit reset */}
                    <button
                      id="sign-in-reset-submit"
                      type="button"
                      onClick={handleResetPassword}
                      disabled={!resetCode || !newResetPassword || resetLoading}
                      className={btnCls}
                    >
                      {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      {resetLoading ? "Resetting…" : "Reset Password"}
                    </button>

                    {/* Back link */}
                    <button
                      type="button"
                      onClick={() => { setForgotSent(false); setResetCode(""); setNewResetPassword(""); setResetError(""); }}
                      className="w-full text-xs font-semibold text-center transition-opacity hover:underline"
                      style={{ color: "#94a3b8" }}
                    >
                      ← Back to sign in
                    </button>
                  </div>
                ) : (
                  <div className="text-right">
                    <button
                      id="sign-in-forgot"
                      type="button"
                      onClick={() => { handleForgotPassword(); setResetSuccess(false); }}
                      disabled={forgotLoading}
                      className="text-xs font-semibold hover:underline transition-opacity disabled:opacity-50"
                      style={{ color: "var(--brand)" }}
                    >
                      {forgotLoading ? "Sending…" : "Forgot password?"}
                    </button>
                  </div>
                )}

                {/* Clerk CAPTCHA placeholder for bot protection */}
                <div id="clerk-captcha" data-cl-theme="dark" />

                {step2Error && (
                  <div
                    className="rounded-xl px-4 py-3 text-sm"
                    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}
                  >
                    {step2Error}
                  </div>
                )}

                <button
                  id="sign-in-submit"
                  onClick={handleSignIn}
                  disabled={!email || !password || step2Loading}
                  className={btnCls}
                >
                  {step2Loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {step2Loading ? "Signing in…" : "Sign In"}
                </button>
              </motion.div>
            )}

            {/* ── STEP 2FA: Email Verification Code ── */}
            {step === "2fa" && (
              <motion.div
                key="step2fa"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-6"
              >
                {/* Back + org label */}
                <div className="flex items-center gap-3">
                  <button
                    id="sign-in-2fa-back"
                    onClick={() => {
                      setVerifyError("");
                      setVerifyCode("");
                      goTo(2, -1);
                    }}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <ArrowLeft className="w-4 h-4 text-white" />
                  </button>
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#94a3b8" }}>
                    Verify your identity
                  </span>
                </div>

                <div>
                  <h1 className="text-2xl font-bold text-white mb-1.5">Check your email.</h1>
                  <p style={{ color: "#94a3b8" }} className="text-sm">
                    We sent a verification code to <span className="text-white font-medium">{email}</span>.
                    Enter it below to continue.
                  </p>
                </div>

                <input
                  id="sign-in-verify-code"
                  type="text"
                  inputMode="numeric"
                  placeholder="6-digit code"
                  maxLength={6}
                  value={verifyCode}
                  onChange={(e) => {
                    setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setVerifyError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleVerifySecondFactor()}
                  className={inputCls}
                  autoFocus
                  autoComplete="one-time-code"
                />

                {verifyError && (
                  <div
                    className="rounded-xl px-4 py-3 text-sm"
                    style={{
                      background: verifyError.startsWith("✓")
                        ? "rgba(16,185,129,0.08)"
                        : "rgba(239,68,68,0.08)",
                      border: verifyError.startsWith("✓")
                        ? "1px solid rgba(16,185,129,0.2)"
                        : "1px solid rgba(239,68,68,0.2)",
                      color: verifyError.startsWith("✓") ? "#10b981" : "#f87171",
                    }}
                  >
                    {verifyError}
                  </div>
                )}

                <button
                  id="sign-in-verify-submit"
                  onClick={handleVerifySecondFactor}
                  disabled={verifyCode.length < 6 || verifyLoading}
                  className={btnCls}
                >
                  {verifyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {verifyLoading ? "Verifying…" : "Verify & Sign In"}
                </button>

                <button
                  type="button"
                  onClick={handleResendCode}
                  className="w-full text-xs font-semibold text-center transition-opacity hover:underline"
                  style={{ color: "#94a3b8" }}
                >
                  Didn't receive a code? Resend
                </button>
              </motion.div>
            )}

            {/* ── STEP 3: Success ── */}
            {step === 3 && (
              <motion.div
                key="step3"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="flex flex-col items-center justify-center py-10 gap-6"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                >
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(16,185,129,0.1)", border: "2px solid rgba(16,185,129,0.3)" }}
                  >
                    <CheckCircle className="w-10 h-10" style={{ color: "#10b981" }} />
                  </div>
                </motion.div>
                <motion.div
                  className="text-center space-y-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <h2 className="text-2xl font-bold text-white">Welcome back.</h2>
                  <p className="text-sm" style={{ color: "#94a3b8" }}>
                    Taking you to your workspace…
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}