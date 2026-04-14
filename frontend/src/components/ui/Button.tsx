"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  variant?:
    | "primary"
    | "secondary"
    | "ghost"
    | "destructive"
    | "accent"
    | "gradient"
    | "topbarIcon"
    | "sidebarNav"
    | "sidebarDanger"
    | "outline"
  size?: "sm" | "md" | "lg" | "icon" | "pill"
  loading?: boolean
}

const variantStyles: Record<string, React.CSSProperties> = {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className, variant = "primary", size = "md",
      asChild = false, loading, children, style, ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button"

    /* ── Variant class strings ─────────────────────────── */
    const variants: Record<string, string> = {
      primary:      "text-white shadow-lg active:scale-95",
      secondary:    "border active:scale-95",
      ghost:        "active:scale-95",
      destructive:  "text-white shadow-lg active:scale-95",
      accent:       "text-white shadow-lg active:scale-95",
      gradient:     "btn-gradient text-white active:scale-95",
      topbarIcon:   "border active:scale-95",
      sidebarNav:   "active:scale-95",
      sidebarDanger:"border active:scale-95",
      outline:      "border active:scale-95",
    }

    /* ── Variant inline styles  ─────────────────────────── */
    const getInlineStyle = (): React.CSSProperties => {
      switch (variant) {
        case "primary":
        case "accent":
          return {
            background: "var(--brand)",
            color:      "white",
            boxShadow:  "0 4px 16px var(--brand-soft)",
          }
        case "secondary":
          return {
            background:   "var(--bg-secondary)",
            borderColor:  "var(--border-subtle)",
            color:        "var(--text-primary)",
          }
        case "ghost":
          return {
            background: "transparent",
            color:      "var(--text-secondary)",
          }
        case "destructive":
          return {
            background: "var(--danger)",
            color:      "white",
            boxShadow:  "0 4px 12px var(--danger-soft)",
          }
        case "topbarIcon":
          return {
            background:  "var(--bg-secondary)",
            borderColor: "var(--border-subtle)",
            color:       "var(--text-secondary)",
          }
        case "sidebarNav":
          return {
            background: "transparent",
            color:      "var(--text-secondary)",
          }
        case "sidebarDanger":
          return {
            background:  "var(--danger-soft)",
            borderColor: "rgba(220,38,38,0.2)",
            color:       "var(--danger)",
          }
        case "outline":
          return {
            background:  "transparent",
            borderColor: "var(--border-subtle)",
            color:       "var(--text-primary)",
          }
        default:
          return {}
      }
    }

    /* ── Size classes ─────────────────────────────────── */
    const sizes: Record<string, string> = {
      sm:   "h-8 px-3 text-xs rounded-lg gap-1.5",
      md:   "h-10 px-5 text-[13px] font-semibold rounded-xl gap-2",
      lg:   "h-12 px-7 text-sm font-bold rounded-2xl gap-2.5",
      icon: "h-9 w-9 flex items-center justify-center rounded-xl",
      pill: "h-8 px-4 text-[11px] rounded-full gap-1.5",
    }

    return (
      <motion.button
        whileHover={!props.disabled && !loading ? { scale: 1.015, y: -1 } : {}}
        whileTap={!props.disabled && !loading ? { scale: 0.97, y: 0 } : {}}
        transition={{ type: "spring", stiffness: 420, damping: 26 }}
        // @ts-ignore
        as={Comp}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          "font-semibold",
          variants[variant],
          sizes[size],
          className
        )}
        style={{
          fontFamily: "var(--font-label)",
          ...getInlineStyle(),
          ...style,
        }}
        ref={ref}
        disabled={loading || props.disabled}
        {...(props as any)}
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          children
        )}
      </motion.button>
    )
  }
)
Button.displayName = "Button"

export { Button }
