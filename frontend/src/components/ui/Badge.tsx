"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "outline" | "soft" | "glow";
  domain?: string;
}

export function Badge({ 
  className, 
  variant = "default", 
  domain,
  children,
  ...props 
}: BadgeProps) {
  
  const variants = {
    default: "bg-[var(--brand)] text-white shadow-sm",
    outline: "bg-transparent border border-[var(--border-subtle)] text-[var(--text-secondary)]",
    soft:    "bg-[var(--brand-soft)] text-[var(--brand)] border border-[var(--brand-glow)]",
    glow:    "bg-[var(--brand-soft)] text-[var(--brand)] border border-[var(--brand)] shadow-[0_0_12px_var(--brand-glow)]",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[clamp(0.5rem,1.0vw,0.625rem)] font-bold transition-all uppercase tracking-widest whitespace-nowrap",
        variants[variant],
        className
      )}
      {...props}
    >
      {children || domain}
    </div>
  );
}
