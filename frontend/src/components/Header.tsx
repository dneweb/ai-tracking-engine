"use client";

import { Bell, Search, Command, Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { ThemeToggle } from "./ThemeToggle";
import { useState, useEffect } from "react";
import { CommandPalette } from "./CommandPalette";
import { motion } from "framer-motion";
import { ProfileDropdown } from "./ProfileDropdown";
import { NotificationHub } from "./NotificationHub";

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
    <header className="topbar glass sticky top-0 px-4 sm:px-8 h-[var(--topbar-height)] border-b border-[var(--border-subtle)] z-[100] transition-all">
      <CommandPalette open={open} setOpen={setOpen} />

      {/* ── Left Zone: Logo & Navigation ── */}
      <div className="flex items-center gap-6 flex-1 min-w-0">
        <button
          id="mobile-menu-toggle"
          className="hamburger-btn sm:hidden p-2.5 rounded-xl hover:bg-[var(--brand-soft)] hover:text-[var(--brand)] active:scale-[0.97] transition-all"
          onClick={onMobileMenuClick}
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <motion.div
          key={pathname}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] }}
          className="flex flex-col min-w-0"
        >
          <h1 className="text-[clamp(0.85rem,1.8vw,1.125rem)] md:text-[clamp(1.0rem,2.0vw,1.25rem)] font-extrabold tracking-tight text-[var(--text-primary)] flex items-center gap-2 truncate">
            <span className="sm:inline">{meta.title.split(" ").slice(0, -1).join(" ")}</span>{" "}
            <span className="brand-gradient-text">
              {meta.title.split(" ").at(-1)}
            </span>
          </h1>
          <div className="hidden sm:flex items-center gap-2 mt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--brand)] animate-pulse" />
            <p className="text-[clamp(0.55rem,1.1vw,0.6875rem)] font-bold text-[var(--text-muted)] tracking-[0.15em] uppercase truncate max-w-[clamp(10.0rem,20.0vw,18.75rem)]">
              {meta.subtitle}
            </p>
          </div>
        </motion.div>
      </div>

      {/* ── Center Zone: Advanced Command Bar ── */}
      <div className="flex-[4] max-w-2xl hidden lg:block">
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-4 px-6 py-3 rounded-2xl text-[var(--text-muted)] bg-[var(--surface-2)]/40 border border-[var(--border-default)] hover:border-[var(--brand)] hover:bg-[var(--surface-1)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.06)] transition-all group/search relative overflow-hidden"
        >
          <Search className="w-5 h-5 group-hover/search:text-[var(--brand)] transition-colors" />
          <span className="text-[clamp(0.7rem,1.4vw,0.875rem)] font-medium flex-1 text-left">
            Search intelligence, nodes, or logs...
          </span>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] shadow-inner">
            <Command className="w-3.5 h-3.5 opacity-60" />
            <span className="text-[clamp(0.55rem,1.1vw,0.6875rem)] font-bold">K</span>
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--brand-glow)] to-transparent -translate-x-full group-hover/search:animate-shimmer pointer-events-none opacity-40" />
        </button>
      </div>

      {/* ── Right Zone: System State ── */}
      <div className="flex items-center justify-end gap-3 sm:gap-6 flex-1">
        <div className="hidden xl:flex items-center gap-3 px-4 py-2 rounded-full border border-[var(--brand-glow)] bg-[var(--brand-soft)]/50 hover:bg-[var(--brand-soft)] transition-colors cursor-default group">
          <div className="w-2 h-2 rounded-full bg-[var(--brand)] animate-pulse-dot shadow-[0_0_8px_var(--brand)]" />
          <span className="label-caps !text-[clamp(0.5rem,1.0vw,0.625rem)] !font-bold !tracking-[0.2em] text-[var(--brand)] group-hover:tracking-[0.25em] transition-all">
            Neural Sync Active
          </span>
        </div>

        <div className="h-6 w-px bg-[var(--border-subtle)] hidden sm:block" />

        <div className="flex items-center gap-2 sm:gap-4">
          <ThemeToggle />

          <NotificationHub />
          
          <ProfileDropdown />
        </div>
      </div>
    </header>
  );
}
