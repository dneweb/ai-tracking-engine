"use client"

import * as React from "react"
import { motion, HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"

export interface CardProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  variant?:
    | "default"
    | "elevated"
    | "glass"
    | "surface"
    | "floating"
    | "recessed"
    | "interactive"
  padding?: "none" | "sm" | "md" | "lg"
  hover?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", padding = "md", hover = false, style, ...props }, ref) => {

    /* ── Variant base styles (inline CSS vars — fully theme-aware) ── */
    const getVariantStyle = (): React.CSSProperties => {
      switch (variant) {
        case "elevated":
          return {
            background:  "var(--card-bg)",
            border:      "1px solid var(--border-default)",
            boxShadow:   "var(--card-shadow)",
          }
        case "glass":
          return {
            background:       "var(--card-bg)",
            border:           "1px solid var(--border-subtle)",
            backdropFilter:   "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
          }
        case "surface":
          return {
            background: "var(--bg-secondary)",
            border:     "1px solid var(--border-subtle)",
          }
        case "floating":
          return {
            background: "var(--card-bg)",
            border:     "1px solid var(--card-border)",
            boxShadow:  "var(--card-shadow-lg)",
          }
        case "recessed":
          return {
            background: "var(--bg-tertiary)",
            border:     "1px solid var(--border-subtle)",
            boxShadow:  "inset 0 2px 6px rgba(0,0,0,0.06)",
          }
        case "interactive":
          return {
            background: "var(--card-bg)",
            border:     "1px solid var(--card-border)",
            boxShadow:  "var(--card-shadow)",
            cursor:     "pointer",
            transition: "all 0.2s cubic-bezier(0.22, 1, 0.36, 1)",
          }
        default: /* "default" */
          return {
            background: "var(--card-bg)",
            border:     "1px solid var(--card-border)",
            boxShadow:  "var(--card-shadow)",
          }
      }
    }

    const paddings: Record<string, string> = {
      none: "p-0",
      sm:   "p-4",
      md:   "p-6",
      lg:   "p-8",
    }

    return (
      <motion.div
        ref={ref}
        className={cn(
          "rounded-2xl overflow-hidden",
          paddings[padding],
          hover && "hover:-translate-y-1 hover:shadow-lg cursor-pointer",
          className
        )}
        style={{
          ...getVariantStyle(),
          transition: "box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease",
          ...style,
        }}
        {...(props as any)}
      />
    )
  }
)
Card.displayName = "Card"

export { Card }
