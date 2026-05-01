"use client";

import { useToast, ToastType, Toast } from "@/context/ToastContext";
import { CheckCircle2, AlertCircle, X, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function ToastContainer() {
    const { toasts, removeToast } = useToast();

    return (
        <div className="fixed bottom-10 right-10 z-[10000] flex flex-col gap-4 pointer-events-none max-w-md w-full">
            <AnimatePresence>
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
                ))}
            </AnimatePresence>
        </div>
    );
}

function ToastItem({ toast, onRemove }: { toast: Toast, onRemove: () => void }) {
    const config: Record<ToastType, { color: string, icon: any, label: string }> = {
        success: { color: "var(--success)", icon: CheckCircle2, label: "Neural Sync Complete" },
        error:   { color: "var(--danger)",  icon: AlertCircle,  label: "System Error Encountered" },
        info:    { color: "var(--brand)",   icon: Info,         label: "Intelligence Update" },
        warning: { color: "var(--warning)", icon: AlertCircle,  label: "Heuristic Caution" },
    };

    const { color, icon: Icon, label } = config[toast.type];

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="pointer-events-auto relative group"
        >
            <div 
                className={cn(
                    "flex flex-col rounded-[1.5rem] bg-[var(--card-bg)] border border-[var(--border-subtle)] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] overflow-hidden transition-all duration-300",
                    "hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.25)] hover:border-[var(--brand-glow)]"
                )}
            >
                {/* Subtle Ambient Glow */}
                <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-[0.03] transition-opacity" 
                    style={{ backgroundColor: color }}
                />

                <div className="flex items-center gap-5 px-6 py-5">
                    <div 
                        className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm border"
                        style={{ 
                            backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`, 
                            borderColor: `color-mix(in srgb, ${color} 20%, transparent)`,
                            color: color 
                        }}
                    >
                        <Icon className="w-6 h-6" />
                    </div>

                    <div className="flex flex-col gap-0.5 flex-grow min-w-0 pr-2">
                        <span className="text-[clamp(0.5rem,1.0vw,0.625rem)] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] opacity-60">
                            {label}
                        </span>
                        <p className="text-[clamp(0.7rem,1.4vw,0.875rem)] font-semibold text-[var(--text-primary)] leading-relaxed truncate">
                            {toast.message}
                        </p>
                    </div>

                    <button
                        onClick={onRemove}
                        className="w-8 h-8 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-xl transition-all"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
                
                {/* Progress Bar with cinematic feel */}
                <div className="h-[0.1875rem] w-full bg-[var(--bg-secondary)]">
                    <motion.div 
                        initial={{ width: "100%" }}
                        animate={{ width: "0%" }}
                        transition={{ duration: 4, ease: "linear" }}
                        className="h-full"
                        style={{ backgroundColor: color }}
                    />
                </div>
            </div>
        </motion.div>
    );
}
