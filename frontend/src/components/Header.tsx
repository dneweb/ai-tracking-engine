"use client";

import { Bell, Search, Command, Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { ThemeToggle } from "./ThemeToggle";
import { useState, useEffect } from "react";
import { CommandPalette } from "./CommandPalette";
import { motion } from "framer-motion";

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  "/":          { title: "Ask Intelligence",  subtitle: "Query the neural knowledge base" },
  "/history":   { title: "Query History",     subtitle: "Neural network traversal log" },
  "/documents": { title: "Knowledge Assets",  subtitle: "Manage core intelligence assets" },
  "/analytics": { title: "Intelligence Insights", subtitle: "Temporal metrics & system efficiency" },
  "/reports":   { title: "Deep Reports",      subtitle: "Automated analysis of knowledge efficiency" },
};

interface HeaderProps {
  /** Called when the hamburger button is pressed on mobile */
  onMobileMenuClick?: () => void;
}

export default function Header({ onMobileMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const { user, isLoaded } = useUser();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const meta = PAGE_META[pathname] ?? { title: "Nexus AI", subtitle: "Neural Intelligence Platform" };

  return (
    <header className="topbar px-4 sm:px-6">
      <CommandPalette open={open} setOpen={setOpen} />

      {/* ── Left Zone: Navigation & Breadcrumbs ── */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <button
          id="mobile-menu-toggle"
          className="hamburger-btn"
          onClick={onMobileMenuClick}
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5 text-[var(--text-primary)]" />
        </button>

        <motion.div
          key={pathname}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="hidden sm:flex flex-col min-w-0"
        >
          <h1 className="text-[14px] font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-1.5">
            {meta.title.split(" ").slice(0, -1).join(" ")}{" "}
            <span className="text-[var(--brand)]">
              {meta.title.split(" ").at(-1)}
            </span>
          </h1>
          <p className="text-[10px] font-medium text-[var(--text-muted)] tracking-wider uppercase mt-0.5 truncate max-w-[200px]">
            {meta.subtitle}
          </p>
        </motion.div>
      </div>

      {/* ── Center Zone: Search Utility ── */}
      <div className="flex-[2] max-w-lg hidden md:block">
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-2xl text-[var(--text-muted)] bg-[var(--input-bg)] border border-[var(--border-subtle)] hover:border-[var(--brand)] hover:shadow-sm transition-all group/search"
        >
          <Search className="w-3.5 h-3.5 group-hover/search:text-[var(--brand)] transition-colors" />
          <span className="text-[12px] font-medium flex-1 text-left">
            Search neural documentation...
          </span>
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
            <Command className="w-2.5 h-2.5" />
            <span className="text-[9px] font-bold">K</span>
          </div>
        </button>
      </div>

      {/* ── Right Zone: System Actions ── */}
      <div className="flex items-center justify-end gap-2 sm:gap-4 flex-1">
        {/* Status — refined */}
        <div className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-[var(--brand-glow)] bg-[var(--brand-soft)] shadow-sm">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--brand)] animate-pulse-dot" />
          <span className="label-caps !text-[9px] !font-bold !tracking-[0.16em] text-[var(--brand)]">
            Neural Sync
          </span>
        </div>

        <div className="h-4 w-px bg-[var(--border-default)] hidden sm:block mx-1" />

        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <ThemeToggle />

          <button
            className="p-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors group/bell relative"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4 text-[var(--text-secondary)] group-hover/bell:text-[var(--text-primary)] transition-colors" />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[var(--brand)] ring-2 ring-[var(--bg-secondary)]" />
          </button>

          {isLoaded && user && (
            <div className="flex items-center gap-3 pl-1 sm:pl-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-md bg-[var(--brand)] ring-2 ring-[var(--bg-primary)]">
                {(user.fullName || user.primaryEmailAddress?.emailAddress || "U").charAt(0).toUpperCase()}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
