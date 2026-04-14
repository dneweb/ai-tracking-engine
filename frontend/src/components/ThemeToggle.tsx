"use client";

import { Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "@/context/ThemeProvider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className="theme-toggle relative flex items-center gap-2 p-1.5 rounded-full overflow-hidden transition-all h-9 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] min-w-[64px]"
      aria-label="Toggle Neural Spectrum"
    >
      <motion.div
        layout
        className="absolute inset-y-1 w-7 rounded-full z-0 shadow-sm bg-[var(--accent-primary)]"
        animate={{
          left: theme === "light" ? "4px" : "auto",
          right: theme === "dark" ? "4px" : "auto",
        }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      />
      
      <div className="relative z-10 flex items-center justify-between w-full px-1">
        <button
          type="button"
          data-theme="light"
          onClick={() => setTheme("light")}
          className={`theme-toggle-btn flex items-center justify-center w-6 h-6 transition-colors ${theme === "light" ? "active text-white" : "text-[var(--text-tertiary)]"}`}
        >
          <Sun className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          data-theme="dark"
          onClick={() => setTheme("dark")}
          className={`theme-toggle-btn flex items-center justify-center w-6 h-6 transition-colors ${theme === "dark" ? "active text-white" : "text-[var(--text-tertiary)]"}`}
        >
          <Moon className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
