"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useClerk, useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, 
  Settings, 
  LogOut, 
  ChevronDown, 
  ShieldCheck,
  CreditCard,
  Bell,
  Sparkles
} from "lucide-react";
import { useRole } from "@/hooks/useRole";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function ProfileDropdown() {
  const { user, isLoaded } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const { roleLabel } = useRole();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  if (!isLoaded || !user) return null;

  const handleSignOut = async () => {
    await signOut();
    router.push("/sign-in");
  };

  return (
    <DropdownMenu.Root onOpenChange={setIsOpen}>
      <DropdownMenu.Trigger asChild>
        <button className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-[var(--border-subtle)] group outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] rounded-xl transition-all">
          <div className="flex flex-col items-end hidden md:flex">
            <span className="text-[clamp(0.65rem,1.3vw,0.8125rem)] font-bold text-[var(--text-primary)] leading-tight group-hover:text-[var(--brand)] transition-colors">
              {user.firstName} {user.lastName}
            </span>
            <span className="text-[clamp(0.5rem,1.0vw,0.625rem)] font-extrabold text-[var(--brand)] uppercase tracking-[0.1em] mt-0.5 opacity-80 flex items-center gap-1">
              <ShieldCheck className="w-2.5 h-2.5" />
              {roleLabel}
            </span>
          </div>
          <div className="relative flex-shrink-0">
            <div className={cn(
              "absolute -inset-1 bg-gradient-to-r from-[var(--brand)] to-[#ec4899] rounded-[1.125rem] transition duration-500 blur-md",
              isOpen ? "opacity-100 scale-110" : "opacity-20 group-hover:opacity-100"
            )} />
            <div className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-[0.75rem] sm:rounded-[1.0rem] flex items-center justify-center text-[clamp(0.75rem,1.5vw,0.9rem)] font-bold text-white shadow-xl bg-gradient-to-br from-[var(--brand)] to-[#8b5cf6] ring-2 ring-[var(--surface-1)] group-hover:scale-105 transition-all cursor-pointer overflow-hidden">
              {user.imageUrl ? (
                <img src={user.imageUrl} alt={user.fullName || "User"} className="w-full h-full object-cover" />
              ) : (
                (user.fullName || user.primaryEmailAddress?.emailAddress || "U").charAt(0).toUpperCase()
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-[var(--surface-1)] rounded-full flex items-center justify-center shadow-sm border border-[var(--border-subtle)]">
              <ChevronDown className={cn("w-2 h-2 sm:w-2.5 sm:h-2.5 text-[var(--text-muted)] transition-transform duration-300", isOpen && "rotate-180")} />
            </div>
          </div>
        </button>
      </DropdownMenu.Trigger>

      <AnimatePresence>
        {isOpen && (
          <DropdownMenu.Portal forceMount>
            <DropdownMenu.Content
              asChild
              align="end"
              sideOffset={12}
              className="z-[1001]"
            >
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: 10, scale: 0.95, filter: "blur(10px)" }}
                transition={{ 
                  duration: 0.3, 
                  type: "spring",
                  stiffness: 300,
                  damping: 30
                }}
                className="w-[calc(100vw-2rem)] sm:w-80 glass-strong rounded-[2rem] border border-[var(--border-strong)] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-hidden p-2 mx-4 sm:mx-0"
              >
                {/* Header Info */}
                <div className="p-5 mb-2 rounded-[1.5rem] bg-gradient-to-br from-[var(--brand-soft)] to-transparent border border-[var(--brand-glow)] relative overflow-hidden group/header">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover/header:opacity-20 transition-opacity">
                    <Sparkles className="w-12 h-12 text-[var(--brand)]" />
                  </div>
                  
                  <div className="flex items-center gap-4 mb-4 relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[#8b5cf6] flex items-center justify-center text-white font-bold text-xl shadow-xl ring-4 ring-white/10 overflow-hidden">
                      {user.imageUrl ? (
                        <img src={user.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        user.firstName?.[0] || "U"
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-base font-bold text-[var(--text-primary)] truncate tracking-tight">
                        {user.fullName}
                      </span>
                      <span className="text-[11px] font-medium text-[var(--text-muted)] truncate opacity-80">
                        {user.primaryEmailAddress?.emailAddress}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-[var(--surface-1)]/60 backdrop-blur-sm border border-[var(--border-subtle)] relative z-10 shadow-sm">
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <div className="w-2.5 h-2.5 rounded-full bg-[var(--brand)] animate-pulse shadow-[0_0_8px_var(--brand)]" />
                        <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-[var(--brand)] animate-ping opacity-40" />
                      </div>
                      <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[var(--brand)]">
                        {roleLabel} Access
                      </span>
                    </div>
                    <div className="px-2 py-0.5 rounded-md bg-[var(--brand-soft)] text-[9px] font-bold text-[var(--brand)] border border-[var(--brand-glow)]">
                      ACTIVE
                    </div>
                  </div>
                </div>

                <div className="space-y-1 px-1">
                  <MenuActionItem 
                    icon={User} 
                    label="Manage Account" 
                    description="Personal info & security"
                    onClick={() => openUserProfile()} 
                  />
                  <MenuActionItem 
                    icon={CreditCard} 
                    label="Billing & Plan" 
                    description="Subscription management"
                  />
                  <MenuActionItem 
                    icon={Settings} 
                    label="System Preferences" 
                    description="Interface & behavior"
                    iconClassName="group-hover/item:rotate-90"
                  />
                  <MenuActionItem 
                    icon={Bell} 
                    label="Notifications" 
                    description="Alerts & neural updates"
                    iconClassName="group-hover/item:animate-bounce"
                  />
                </div>

                <div className="my-3 mx-2 h-px bg-[var(--border-subtle)] opacity-50" />

                <div className="px-1 pb-1">
                  <DropdownMenu.Item
                    onClick={handleSignOut}
                    className="flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-extrabold text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-all cursor-pointer outline-none group/logout"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[var(--danger-soft)] flex items-center justify-center group-hover/logout:bg-[var(--danger)] group-hover/logout:text-white transition-colors">
                      <LogOut className="w-4 h-4 group-hover/logout:-translate-x-0.5 transition-transform" />
                    </div>
                    <div className="flex flex-col">
                      <span className="leading-tight">Disconnect Session</span>
                      <span className="text-[10px] font-medium opacity-60 mt-0.5">End your current neural link</span>
                    </div>
                  </DropdownMenu.Item>
                </div>
              </motion.div>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        )}
      </AnimatePresence>
    </DropdownMenu.Root>
  );
}

function MenuActionItem({ 
  icon: Icon, 
  label, 
  description, 
  onClick, 
  iconClassName 
}: { 
  icon: any, 
  label: string, 
  description?: string, 
  onClick?: () => void,
  iconClassName?: string
}) {
  return (
    <DropdownMenu.Item
      onClick={onClick}
      className="flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--brand)] hover:bg-[var(--brand-soft)] transition-all cursor-pointer outline-none group/item"
    >
      <div className={cn(
        "w-8 h-8 rounded-lg bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-muted)] group-hover/item:bg-[var(--brand-soft)] group-hover/item:text-[var(--brand)] transition-all",
        iconClassName
      )}>
        <Icon className="w-4.5 h-4.5 transition-transform" />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="leading-tight group-hover/item:translate-x-0.5 transition-transform">{label}</span>
        {description && (
          <span className="text-[10px] font-medium text-[var(--text-muted)] opacity-70 group-hover/item:text-[var(--brand)] group-hover/item:opacity-60 transition-colors mt-0.5">
            {description}
          </span>
        )}
      </div>
    </DropdownMenu.Item>
  );
}
