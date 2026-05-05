"use client";

import { Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "@/context/ThemeProvider";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className="relative flex items-center gap-1.5 p-1 rounded-full overflow-hidden transition-all h-10 glass shadow-inner border border-[var(--border-subtle)] min-w-[clamp(3.6rem,7.2vw,4.5rem)] cursor-pointer group"
      aria-label="Toggle Neural Spectrum"
    >
      <motion.div
        layout
        className="absolute inset-y-1 w-8 rounded-full z-0 shadow-lg bg-gradient-to-br from-[var(--brand)] to-[var(--blue-ribbon-700)]"
        animate={{
          left: theme === "light" ? "0.25rem" : "calc(100% - 2.25rem)",
        }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
      
      <div className="relative z-10 flex items-center justify-between w-full px-1">
        <button
          type="button"
          onClick={() => setTheme("light")}
          className={`flex items-center justify-center w-7 h-7 rounded-full transition-all duration-500 ${theme === "light" ? "text-white" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}
        >
          <Sun className={cn("w-4 h-4 transition-transform duration-500", theme === "light" ? "scale-110 rotate-0" : "scale-90 -rotate-90")} />
        </button>
        <button
          type="button"
          onClick={() => setTheme("dark")}
          className={`flex items-center justify-center w-7 h-7 rounded-full transition-all duration-500 ${theme === "dark" ? "text-white" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}
        >
          <Moon className={cn("w-4 h-4 transition-transform duration-500", theme === "dark" ? "scale-110 rotate-0" : "scale-90 45deg")} />
        </button>
      </div>
    </div>
  );
}
