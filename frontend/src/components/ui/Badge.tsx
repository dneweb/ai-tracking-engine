"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export type Domain = "HR" | "Finance" | "IT Security" | "Engineering" | "Operations" | string

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "solid" | "subtle" | "outline" | "pill"
  tone?: "success" | "warning" | "error" | "info" | "neutral"
  size?: "sm" | "md"
  domain?: Domain
  confidence?: number
}

/* ── Domain → color mapping ────────────────────────────── */
const domainMap: Record<string, { bg: string; text: string; border: string }> = {
  HR: {
    bg: "var(--brand-soft)",
    text: "var(--brand)",
    border: "var(--brand-glow)",
  },
  Finance: {
    bg: "var(--warning-soft)",
    text: "var(--warning)",
    border: "var(--warning-ring)",
  },
  "IT Security": {
    bg: "var(--danger-soft)",
    text: "var(--danger)",
    border: "var(--danger-ring)",
  },
  Engineering: {
    bg: "var(--success-soft)",
    text: "var(--success)",
    border: "var(--success-ring)",
  },
  Operations: {
    bg: "var(--info-soft)",
    text: "var(--info)",
    border: "var(--info-ring)",
  },
}

/* ── Confidence → color ─────────────────────────────────── */
function getConfidenceStyle(confidence: number) {
  const norm = confidence > 1 ? confidence / 100 : confidence
  if (norm >= 0.8)
    return { bg: "var(--success-soft)", text: "var(--success)", border: "var(--success-ring)" }
  if (norm >= 0.6)
    return { bg: "var(--warning-soft)", text: "var(--warning)", border: "var(--warning-ring)" }
  return { bg: "var(--danger-soft)", text: "var(--danger)", border: "var(--danger-ring)" }
}

/* ── Tone mapping ───────────────────────────────────────── */
const toneMap: Record<string, { bg: string; text: string; border: string }> = {
  success: { bg: "var(--success-soft)", text: "var(--success)", border: "var(--success-ring)" },
  warning: { bg: "var(--warning-soft)", text: "var(--warning)", border: "var(--warning-ring)" },
  error:   { bg: "var(--danger-soft)",  text: "var(--danger)",  border: "var(--danger-ring)"  },
  info:    { bg: "var(--info-soft)",    text: "var(--info)",    border: "var(--info-ring)"    },
  neutral: { bg: "var(--bg-tertiary)", text: "var(--text-secondary)", border: "var(--border-subtle)" },
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  (
    { className, variant = "subtle", tone, size = "md", domain, confidence, style, children, ...props },
    ref
  ) => {
    /* Resolve colors */
    let colors = { bg: "var(--brand-soft)", text: "var(--brand)", border: "rgba(91,78,248,0.18)" }

    if (tone) {
      colors = toneMap[tone] ?? colors
    } else if (confidence !== undefined) {
      colors = getConfidenceStyle(confidence)
    } else if (domain) {
      colors = domainMap[domain] ?? colors
    }

    const isPill = variant === "pill"
    const sizeClass = size === "sm"
      ? "px-2 py-0.5 text-[9px] gap-1"
      : "px-2.5 py-0.5 text-[10px] gap-1.5"

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center font-semibold uppercase tracking-wider transition-colors focus:outline-none",
          isPill ? "rounded-full" : "rounded-md",
          sizeClass,
          className
        )}
        style={{
          background: colors.bg,
          color:      colors.text,
          border:     `1px solid ${colors.border}`,
          fontFamily: "var(--font-label)",
          ...style,
        }}
        {...props}
      />
    )
  }
)
Badge.displayName = "Badge"

export { Badge }
