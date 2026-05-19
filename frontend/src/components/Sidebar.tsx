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
  Users,
  X,
  CreditCard,
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
  { href: "/dashboard/members", label: "Members & Teams", icon: Users, desc: "Manage team access" },
  { href: "/dashboard/billing", label: "Billing & Plans", icon: CreditCard, desc: "Manage subscription plans" },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const { signOut, openUserProfile } = useClerk();
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const { isAdmin, isOwner, roleLabel, isLoaded } = useRole();

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
          "sidebar bg-[var(--surface-1)]/90 backdrop-blur-3xl !border-r-[var(--border-subtle)] shadow-[4px_0_24px_rgba(0,0,0,0.02)]",
          mobileOpen && "open"
        )}
      >
        {/* Logo Section */}
        <div className="sidebar-header h-[clamp(4.2rem,8.4vw,5.25rem)] min-h-[clamp(4.2rem,8.4vw,5.25rem)] flex items-center px-6 max-lg:px-0 max-md:px-6 max-lg:justify-center max-md:justify-between flex-shrink-0 border-b border-[var(--border-subtle)] bg-[var(--surface-2)]/30">
          <Link href="/" className="flex items-center gap-4 max-lg:gap-0 max-md:gap-4 group min-w-0" onClick={onMobileClose}>
            <div
              className="w-11 h-11 max-lg:w-10 max-lg:h-10 max-md:w-11 max-md:h-11 rounded-[0.875rem] flex items-center justify-center flex-shrink-0 relative overflow-hidden shadow-xl bg-gradient-to-br from-[var(--brand)] to-[var(--blue-ribbon-600)] ring-1 ring-white/20 group-hover:scale-105 active:scale-[0.97] transition-transform p-2"
            >
              <img src="/logo.svg" alt="Memora Logo" className="w-full h-full object-contain relative z-10 brightness-0 invert" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
            <div className="brand-name min-w-0 flex flex-col max-lg:hidden max-md:flex">
              <div className="text-[clamp(0.9rem,1.8vw,1.125rem)] font-bold tracking-tighter text-[var(--text-primary)] leading-none">
                Memora <span className="brand-gradient-text">AI.</span>
              </div>
              <div className="label-caps mt-1.5 !text-[clamp(0.45rem,0.9vw,0.5625rem)] !tracking-[0.2em] opacity-60">
                Neural Platform
              </div>
            </div>
          </Link>

          {/* Mobile Close Button */}
          <button
            onClick={onMobileClose}
            className="hidden max-md:flex w-10 h-10 items-center justify-center rounded-xl bg-[var(--surface-3)]/50 border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--brand)] transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 py-5 px-3 max-lg:px-2 max-md:px-3 space-y-6 max-lg:space-y-4 max-md:space-y-6 overflow-y-auto scrollbar-hide pt-6">
          {/* Core Section */}
          <div className="space-y-0.5 max-lg:flex max-lg:flex-col max-lg:items-center max-md:block">
            <div className="section-label label-caps px-2.5 mb-3 !text-[clamp(0.5rem,1.0vw,0.625rem)] max-lg:hidden max-md:block">Neural Access</div>
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
            <div className="space-y-0.5 pt-2 max-lg:flex max-lg:flex-col max-lg:items-center max-md:block">
              <div className="section-label label-caps px-2.5 mb-3 !text-[clamp(0.5rem,1.0vw,0.625rem)] max-lg:hidden max-md:block">Command & Control</div>
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

        {/* Footer Area */}
        <div className="sidebar-footer p-5 max-lg:p-3 max-md:p-5 space-y-5 max-lg:space-y-3 max-md:space-y-5 flex-shrink-0 border-t border-[var(--border-subtle)] bg-[var(--surface-2)]/40 backdrop-blur-xl max-lg:flex max-lg:flex-col max-lg:items-center max-md:block">
          {/* Status Monitor */}
          <div className="rounded-[1.25rem] p-4 max-lg:p-3 max-md:p-4 flex items-center justify-between gap-4 max-lg:justify-center max-md:justify-between bg-[var(--brand-soft)] border border-[var(--brand-glow)] hover:border-[var(--brand)] transition-all group/status cursor-pointer">
            <div className="flex items-center gap-3 max-lg:gap-0 max-md:gap-3 min-w-0">
              <div className="relative">
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--brand)] animate-pulse shadow-[0_0_12px_var(--brand)]" />
                <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-[var(--brand)] animate-ping" />
              </div>
              <div className="flex flex-col min-w-0 sidebar-footer-status-text max-lg:hidden max-md:flex">
                <div className="label-caps !text-[clamp(0.5rem,1.0vw,0.625rem)] text-[var(--brand)] !tracking-[0.15em] font-extrabold truncate">
                  Memora Online
                </div>
                <div className="text-[clamp(0.45rem,0.9vw,0.5625rem)] font-bold text-[var(--text-muted)] tracking-tight mt-0.5 truncate uppercase">
                  Encrypted · v1.2.4
                </div>
              </div>
            </div>
            <Zap className="w-4 h-4 max-lg:hidden max-md:block text-[var(--brand)] opacity-40 group-hover/status:opacity-100 transition-opacity" />
          </div>

          {/* User & Session Control */}
          <div className="flex flex-col gap-3 max-lg:gap-2 max-md:gap-3 max-lg:items-center max-md:items-stretch w-full">
            <button
              onClick={() => openUserProfile()}
              className="flex items-center gap-4 max-lg:gap-0 max-md:gap-4 p-3 max-lg:p-2 max-md:p-3 max-lg:justify-center max-md:justify-start rounded-[1.375rem] max-lg:rounded-xl max-md:rounded-[1.375rem] bg-[var(--surface-1)] border border-[var(--border-subtle)] shadow-sm hover:shadow-md hover:border-[var(--brand)] transition-all duration-500 w-full text-left group overflow-hidden tablet-rail-center"
            >
              <div className="relative flex-shrink-0">
                <div className="absolute -inset-1 bg-gradient-to-r from-[var(--brand)] to-[var(--blue-ribbon-600)] rounded-[1.0rem] opacity-0 group-hover:opacity-20 blur-md transition-all" />
                <div
                  className="relative w-10 h-10 max-lg:w-9 max-lg:h-9 max-md:w-10 max-md:h-10 rounded-[0.875rem] flex-shrink-0 flex items-center justify-center text-[clamp(0.75rem,1.5vw,0.9375rem)] font-bold text-white shadow-xl bg-gradient-to-br from-[var(--brand)] to-[var(--blue-ribbon-600)] ring-2 ring-white/10 group-hover:scale-105 transition-transform"
                >
                  {user?.imageUrl ? (
                    <img src={user.imageUrl} alt="" className="w-full h-full object-cover rounded-[0.875rem]" />
                  ) : (
                    user?.firstName?.[0] || user?.emailAddresses[0]?.emailAddress[0]?.toUpperCase() || "U"
                  )}
                </div>
              </div>
              <div className="neural-mode-text flex-1 min-w-0 max-lg:hidden max-md:block">
                <div className="text-[clamp(0.7rem,1.4vw,0.875rem)] font-bold text-[var(--text-primary)] truncate leading-tight group-hover:text-[var(--brand)] transition-colors">
                  {user?.fullName || "User Instance"}
                </div>
                <div className="label-caps !text-[clamp(0.45rem,0.9vw,0.5625rem)] mt-1 text-[var(--brand)] font-extrabold tracking-widest">
                  {roleLabel}
                </div>
              </div>
            </button>

            <button
              onClick={handleSignOut}
              className="flex items-center justify-center gap-3 max-lg:gap-0 max-md:gap-3 w-full px-5 py-3 max-lg:p-3 max-md:px-5 max-md:py-3 text-[clamp(0.55rem,1.1vw,0.6875rem)] font-extrabold uppercase tracking-[0.2em] rounded-xl transition-all border border-transparent text-[var(--danger)] hover:bg-[var(--danger-soft)] hover:border-[var(--danger-ring)] group/logout active:scale-[0.97]"
            >
              <LogOut className="w-4 h-4 group-hover/logout:-translate-x-1 transition-transform flex-shrink-0" />
              <span className="collapse-btn-text max-lg:hidden">Disconnect</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function SidebarLink({ href, label, icon: Icon, active, onClick }: any) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "nav-item flex items-center gap-4 max-lg:gap-0 max-md:gap-4 px-4 py-3.5 max-lg:px-0 max-lg:justify-center max-md:px-4 max-md:justify-start max-lg:w-12 max-lg:h-12 max-md:w-full max-md:h-auto rounded-2xl text-[clamp(0.7rem,1.4vw,0.875rem)] font-bold transition-all duration-500 group relative overflow-hidden active:scale-[0.97]",
        active 
          ? "bg-[var(--surface-1)] text-[var(--brand)] border border-[var(--border-subtle)] shadow-[0_8px_32px_rgba(0,0,0,0.04)]" 
          : "text-[var(--text-secondary)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]"
      )}
    >
      {/* Active glow effect */}
      {active && (
        <motion.div
          layoutId="sidebar-active-glow"
          transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }}
          className="absolute inset-0 bg-gradient-to-r from-[var(--brand-soft)] to-transparent pointer-events-none"
        />
      )}

      <Icon
        className={cn(
          "w-4 h-4 max-lg:w-5 max-lg:h-5 max-md:w-4 max-md:h-4 flex-shrink-0 transition-transform group-hover:scale-105",
          active ? "text-[var(--brand)]" : "text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]"
        )}
      />

      <span
        className="nav-label flex-1 font-body text-[clamp(0.65rem,1.3vw,0.8125rem)] whitespace-nowrap max-lg:hidden max-md:block"
      >
        {label}
      </span>

      {!active && (
        <ChevronRight className="nav-label w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-30 group-hover:translate-x-0 transition-all max-lg:hidden max-md:block" />
      )}
    </Link>
  );
}
