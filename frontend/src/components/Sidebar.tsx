"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import { useRole } from "@/hooks/useRole";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Brain,
  History,
  FileText,
  PieChart,
  LogOut,
  Activity,
  BarChart3,
  ChevronRight,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mainLinks = [
  { href: "/",        label: "Company Brain", icon: Brain,    desc: "Interact with the neural base" },
  { href: "/history", label: "Interaction Log",    icon: History,  desc: "Past neural queries" },
];

const adminLinks = [
  { href: "/documents", label: "Knowledge Assets", icon: FileText,  desc: "Manage the vector base" },
  { href: "/analytics", label: "System Metrics",     icon: PieChart,  desc: "Performance analytics" },
  { href: "/reports",   label: "Insights & SOPs",     icon: BarChart3, desc: "SOP deficiency analysis" },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const { signOut } = useClerk();
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const { isAdmin, isLoaded } = useRole();

  const handleSignOut = async () => {
    await signOut();
    router.push("/sign-in");
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname?.startsWith(href + "/");

  if (!isLoaded) return null;

  return (
    <>
      <aside
        className={cn(
          "sidebar",
          mobileOpen && "open"
        )}
      >
        {/* Logo */}
        <div className="sidebar-header h-[56px] min-h-[56px] flex items-center px-4 flex-shrink-0">
          <Link href="/" className="flex items-center gap-3 group min-w-0" onClick={onMobileClose}>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 relative overflow-hidden shadow-lg bg-[var(--brand)]"
            >
              <Activity className="w-4 h-4 text-white relative z-10" />
            </div>
            <div className="brand-name min-w-0 leading-none">
              <div className="text-[15px] font-display font-normal tracking-tight text-[var(--text-primary)]">
                Nexus <span className="text-[var(--brand)]">AI</span>
              </div>
              <div className="label-caps mt-0.5 !text-[10px]">
                Neural Platform
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex-1 py-5 px-3 space-y-6 overflow-y-auto scrollbar-hide pt-6">
          {/* Core Section */}
          <div className="space-y-0.5">
            <div className="section-label label-caps px-2.5 mb-3 !text-[10px]">Neural Access</div>
            {mainLinks.map((link) => (
              <SidebarLink
                key={link.href}
                {...link}
                active={isActive(link.href)}
                onClick={onMobileClose}
              />
            ))}
          </div>

          {/* Administrator Section */}
          {isAdmin && (
            <div className="space-y-0.5 pt-2">
              <div className="section-label label-caps px-2.5 mb-3 !text-[10px]">Command & Control</div>
              {adminLinks.map((link) => (
                <SidebarLink
                  key={link.href}
                  {...link}
                  active={isActive(link.href)}
                  onClick={onMobileClose}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sidebar-footer p-4 space-y-4 flex-shrink-0 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)]">
          {/* Status Badge */}
          <div className="rounded-xl p-3 flex items-center justify-between gap-3 bg-[var(--brand-soft)] border border-[var(--brand-glow)] hover:border-[var(--brand)] transition-all group/status cursor-default">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-2 h-2 rounded-full bg-[var(--brand)] animate-pulse-dot shadow-[0_0_8px_var(--brand)] flex-shrink-0" />
              <div className="flex flex-col min-w-0">
                <div className="label-caps !text-[9px] text-[var(--brand)] !tracking-[0.18em] truncate">
                  Nexus Active
                </div>
                <div className="label-caps !text-[8.5px] text-[var(--text-muted)] tracking-[0.1em] normal-case mt-0.5 truncate">
                  v1.2.4 · Encrypted
                </div>
              </div>
            </div>
            <Zap className="w-3.5 h-3.5 text-[var(--brand)] opacity-40 group-hover/status:opacity-100 transition-opacity" />
          </div>

          {/* User Card + Logout */}
          <div className="flex flex-col gap-2">
            <div
              className="flex items-center gap-3 p-2 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] shadow-sm hover:border-[var(--border-strong)] transition-all"
            >
              <div
                className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-sm font-bold text-white shadow-md bg-[var(--brand)]"
              >
                {user?.firstName?.[0] || user?.emailAddresses[0]?.emailAddress[0]?.toUpperCase() || "U"}
              </div>
              <div className="neural-mode-text flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
                  {user?.fullName || "User Instance"}
                </div>
                <div className="label-caps !text-[9px] mt-0.5 text-[var(--text-muted)]">
                  {isAdmin ? "Administrator" : "System User"}
                </div>
              </div>
            </div>

            {/* Persistent Terminate Session Action */}
            <button
              onClick={handleSignOut}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest rounded-xl transition-all border border-transparent text-[var(--danger)] hover:bg-[var(--danger-soft)] hover:border-[var(--danger-ring)] group/logout"
            >
              <LogOut className="w-3.5 h-3.5 group-hover/logout:-translate-x-0.5 transition-transform" />
              Terminate Session
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      <div className="sidebar-overlay" onClick={onMobileClose} />
    </>
  );
}

function SidebarLink({ href, label, icon: Icon, active, onClick }: any) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "nav-item flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-[13px] font-medium transition-all group relative overflow-hidden",
        active 
          ? "bg-[var(--sidebar-item-active-bg)] text-[var(--sidebar-item-active-text)] border border-[var(--sidebar-border)]" 
          : "text-[var(--text-secondary)] hover:bg-[var(--sidebar-item-hover)]"
      )}
    >
      {/* Active glow bar */}
      {active && (
        <motion.div
          layoutId="sidebar-active-bar"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-[var(--brand)]"
        />
      )}

      <Icon
        className={cn(
          "w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-105",
          active ? "text-[var(--brand)]" : "text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]"
        )}
      />

      <span
        className="nav-label flex-1 font-body text-[13px] whitespace-nowrap"
      >
        {label}
      </span>

      {!active && (
        <ChevronRight className="nav-label w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-30 group-hover:translate-x-0 transition-all" />
      )}
    </Link>
  );
}
