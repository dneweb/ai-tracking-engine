"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  icon?: React.ReactNode
  variant?: "default" | "search" | "dense"
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, icon, variant = "default", ...props }, ref) => {
    const variantClass =
      variant === "search"
        ? "h-12 rounded-2xl bg-[var(--bg-secondary)] border-[var(--border-subtle)] pl-12"
        : variant === "dense"
          ? "h-9 rounded-lg text-[clamp(0.65rem,1.3vw,0.8125rem)]"
          : "h-11 rounded-xl"

    return (
      <div className="w-full space-y-1.5 group">
        <div className="relative">
          {icon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--brand)] transition-colors">
              {icon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              "flex w-full border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-2 text-sm text-[var(--text-primary)] transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-soft)] focus-visible:border-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-50",
              variantClass,
              icon && variant !== "search" && "pl-11",
              error && "border-[var(--danger)] focus-visible:ring-[var(--danger-soft)]",
              className
            )}
            ref={ref}
            {...props}
          />
        </div>
        {error && (
          <p className="text-[clamp(0.55rem,1.1vw,0.6875rem)] font-medium text-[var(--danger)] animate-in fade-in slide-in-from-top-1">
            {error}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
