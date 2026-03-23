"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import { useRole } from "@/hooks/useRole";
import Link from "next/link";
import { 
  PlusCircle, 
  History, 
  FileText, 
  Settings, 
  PieChart, 
  LogOut, 
  ChevronRight, 
  ChevronDown, 
  Search,
  LayoutDashboard,
  Shield,
  Activity,
  Zap,
  BarChart3
} from "lucide-react";

export default function Sidebar() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const { isAdmin, isLoaded } = useRole();

  const handleSignOut = async () => {
    await signOut();
    router.push("/sign-in");
  };

  if (!isLoaded) {
    return (
      <aside className="w-[280px] bg-sidebar min-h-screen flex items-center justify-center border-r border-border">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">System Booting</div>
        </div>
      </aside>
    );
  }

  const mainLinks = [
    { href: "/", label: "Ask Question", icon: PlusCircle },
    { href: "/history", label: "Query History", icon: History },
  ];

  const adminLinks = [
    { href: "/documents", label: "Documents", icon: FileText },
    { href: "/analytics", label: "Analytics", icon: PieChart },
    { href: "/reports", label: "Reports", icon: BarChart3 },
  ];

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + "/");

  return (
    <aside
      className="w-[280px] bg-sidebar min-h-screen flex flex-col border-r border-border fixed left-0 top-0 z-50"
      aria-label="Sidebar navigation"
    >
      {/* Brand Header */}
      <div className="px-6 py-8">
        <Link href="/" className="group flex items-center gap-3 no-underline">
          <div
            className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform duration-300"
            aria-label="Brand logo"
          >
            <Activity className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-white font-bold text-lg">AI Tracker</span>
            <span className="text-muted-foreground text-sm">Dashboard</span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-6 space-y-4" aria-label="Main navigation">
        {/* Navigation Groups */}
        <div>
          <h3 className="px-4 text-xs font-bold text-muted-foreground uppercase tracking-[0.15em] mb-4">Core</h3>
          <div className="flex flex-col gap-1">
            {mainLinks.map((link) => {
              const Active = isActive(link.href);
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`group relative flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    Active 
                      ? "text-foreground bg-white/[0.03] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" 
                      : "text-muted-foreground hover:text-foreground hover:bg-white/[0.02]"
                  }`}
                  aria-current={Active ? "page" : undefined}
                >
                  <Icon className={`w-4 h-4 transition-transform duration-300 ${Active ? "text-primary scale-110" : "group-hover:scale-110"}`} aria-hidden="true" />
                  <span>{link.label}</span>
                  {Active && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full shadow-[0_0_12px_rgba(139,92,246,0.5)]" />
                  )}
                  {!Active && (
                    <ChevronRight className="ml-auto w-3.5 h-3.5 opacity-0 -translate-x-2 group-hover:opacity-40 group-hover:translate-x-0 transition-all" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {isAdmin && (
          <div>
            <h3 className="px-4 text-xs font-bold text-muted-foreground uppercase tracking-[0.15em] mb-4">Administrator</h3>
            <div className="flex flex-col gap-1">
              {adminLinks.map((link) => {
                const Active = isActive(link.href);
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`group relative flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                      Active 
                        ? "text-foreground bg-white/[0.03] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" 
                        : "text-muted-foreground hover:text-foreground hover:bg-white/[0.02]"
                    }`}
                    aria-current={Active ? "page" : undefined}
                  >
                    <Icon className={`w-4 h-4 transition-transform duration-300 ${Active ? "text-primary scale-110" : "group-hover:scale-110"}`} aria-hidden="true" />
                    <span>{link.label}</span>
                    {Active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full shadow-[0_0_12px_rgba(139,92,246,0.5)]" />
                    )}
                    {!Active && (
                      <ChevronRight className="ml-auto w-3.5 h-3.5 opacity-0 -translate-x-2 group-hover:opacity-40 group-hover:translate-x-0 transition-all" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Footer Profile */}
      <div className="p-4 mt-auto">
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center text-white font-bold text-sm shadow-lg border border-white/10 ring-2 ring-primary/20">
              {user?.firstName?.[0]?.toUpperCase() ??
                user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() ??
                "U"}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-foreground text-sm font-bold truncate tracking-tight">
                {isAdmin ? "Administrator" : "System User"}
              </p>
              <p className="text-muted-foreground text-xs font-medium truncate uppercase tracking-wider">
                {isAdmin ? "Admin Space" : "User Space"}
              </p>
            </div>
          </div>

          <div className="h-px bg-white/[0.05] mx-1" />

          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-muted-foreground hover:text-danger w-full px-2 py-1.5 text-xs font-semibold transition-colors group/btn"
          >
            <LogOut className="w-3.5 h-3.5 group-hover/btn:-translate-x-0.5 transition-transform" />
            <span>Terminate Session</span>
          </button>
        </div>
        <div className="px-4 pb-8">
            <div className="glass rounded-[1.5rem] p-5 relative overflow-hidden group">
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-[0.15em]">
                        <Shield className="w-3.5 h-3.5" />
                        Neural Security
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">System is operating in full-encryption mode. Neural clusters are isolated.</p>
                    <div className="pt-1">
                        <span className="text-xs font-bold text-foreground">v1.2.4-Production</span>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </aside>
  );
}
