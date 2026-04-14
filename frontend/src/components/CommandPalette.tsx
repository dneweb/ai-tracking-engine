"use client";

import React from "react";
import { Command } from "cmdk";
import { Search, FileText, History, PieChart, BarChart3, Activity, User, Settings, LogOut, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

import * as Dialog from "@radix-ui/react-dialog";

export function CommandPalette({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, setOpen]);

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, [setOpen]);

  return (
    <AnimatePresence>
      {open && (
        <Command.Dialog
          open={open}
          onOpenChange={setOpen}
          label="Global Command Palette"
          className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4"
        >
          <div style={{ position: 'absolute', width: '1px', height: '1px', padding: '0', margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', borderWidth: '0' }}>
            <Dialog.Title>Global Command Palette</Dialog.Title>
            <Dialog.Description>Search and navigate through the neural tracking engine interface.</Dialog.Description>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-2xl overflow-hidden border border-[var(--border-subtle)] rounded-[24px] shadow-2xl bg-[var(--bg-secondary)]/95 backdrop-blur-xl"
          >
            <div className="flex items-center px-6 py-4 border-b border-[var(--border-subtle)]">
              <Search className="w-5 h-5 text-[var(--text-muted)] mr-4" />
              <Command.Input
                placeholder="Search queries, documents, or navigation..."
                className="flex-1 bg-transparent border-none outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/40 text-base font-medium"
              />
              <div className="flex items-center gap-1 px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg text-[10px] font-bold text-[var(--text-muted)] ml-4">
                ESC
              </div>
            </div>

            <Command.List className="max-h-[480px] overflow-y-auto p-3 scrollbar-hide">
              <Command.Empty className="py-12 text-center text-[var(--text-muted)] text-sm">
                No results discovered in neural database.
              </Command.Empty>

              <Command.Group heading="NAVIGATION" className="text-[10px] font-bold text-[var(--text-muted)] tracking-[0.14em] uppercase px-4 py-3">
                <CommandItem onSelect={() => runCommand(() => router.push("/"))} icon={Activity}>
                  Ask Intelligence
                </CommandItem>
                <CommandItem onSelect={() => runCommand(() => router.push("/history"))} icon={History}>
                  Query History
                </CommandItem>
                <CommandItem onSelect={() => runCommand(() => router.push("/documents"))} icon={FileText}>
                  Knowledge Base
                </CommandItem>
                <CommandItem onSelect={() => runCommand(() => router.push("/analytics"))} icon={PieChart}>
                  Analytics
                </CommandItem>
                <CommandItem onSelect={() => runCommand(() => router.push("/reports"))} icon={BarChart3}>
                  Deep Reports
                </CommandItem>
              </Command.Group>

              <Command.Group heading="SYSTEM" className="text-[10px] font-bold text-[var(--text-muted)] tracking-[0.14em] uppercase px-4 py-3 border-t border-[var(--border-subtle)] mt-2">
                <CommandItem onSelect={() => runCommand(() => {})} icon={User}>
                  Account Settings
                </CommandItem>
                <CommandItem onSelect={() => runCommand(() => {})} icon={Settings}>
                  Preferences
                </CommandItem>
              </Command.Group>

              <Command.Group heading="ACTIONS" className="text-[10px] font-bold text-[var(--text-muted)] tracking-[0.14em] uppercase px-4 py-3 border-t border-[var(--border-subtle)] mt-2">
                 <CommandItem label="Sign Out" onSelect={() => runCommand(() => {})} icon={LogOut} destructive>
                  Sign Out
                </CommandItem>
              </Command.Group>
            </Command.List>

            <div className="px-6 py-4 bg-[var(--bg-primary)]/50 border-t border-[var(--border-subtle)] flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-[9px] text-[var(--text-muted)]">
                    <span className="px-1.5 py-0.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded lowercase">↑↓</span>
                    Navigate
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] text-[var(--text-muted)]">
                    <span className="px-1.5 py-0.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded lowercase">Enter</span>
                    Execute
                  </div>
               </div>
               <div className="text-[9px] text-[var(--brand)] uppercase tracking-widest font-bold">
                 Neural Search Mode Active
               </div>
            </div>
          </motion.div>
          <div 
            className="fixed inset-0 -z-10 bg-black/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setOpen(false)}
          />
        </Command.Dialog>
      )}
    </AnimatePresence>
  );
}

function CommandItem({ children, onSelect, icon: Icon, destructive, label }: any) {
  return (
    <Command.Item
      onSelect={onSelect}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl cursor-default transition-all data-[selected=true]:shadow-sm group",
        destructive 
          ? "text-[var(--danger)] data-[selected=true]:bg-[var(--danger)]/10" 
          : "text-[var(--text-primary)] data-[selected=true]:bg-[var(--brand-soft)]"
      )}
    >
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors shadow-inner",
        destructive 
          ? "bg-[var(--danger)]/10 text-[var(--danger)]" 
          : "bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-muted)] group-data-[selected=true]:text-[var(--brand)] group-data-[selected=true]:border-[var(--brand)]/30"
      )}>
        <Icon className="w-4 h-4" />
      </div>
      <span className="flex-1 text-[13px] font-medium tracking-tight">
        {label || children}
      </span>
      <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] opacity-0 group-data-[selected=true]:opacity-100 transition-opacity translate-x-[-4px] group-data-[selected=true]:translate-x-0" />
    </Command.Item>
  );
}
