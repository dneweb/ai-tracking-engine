"use client";

import { useToast } from "@/context/ToastContext";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { clsx } from "clsx";
import { useState } from "react";

export default function ToastContainer() {
    const { toasts, removeToast } = useToast();

    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-8 right-8 z-[9999] flex flex-col gap-4 pointer-events-none max-w-md w-full">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
            ))}
        </div>
    );
}

function ToastItem({ toast, onRemove }: { toast: { id: string, type: 'success'|'error', message: string }, onRemove: () => void }) {
    const [isExiting, setIsExiting] = useState(false);

    const handleRemove = () => {
        setIsExiting(true);
        setTimeout(onRemove, 300);
    };

    return (
        <div
            className={clsx(
                "pointer-events-auto flex flex-col rounded-2xl border glass shadow-2xl overflow-hidden transition-all duration-300",
                isExiting ? "opacity-0 translate-x-12 scale-95" : "animate-in slide-in-from-right-8 fade-in zoom-in-95 duration-500 [animation-timing-function:cubic-bezier(0.34,1.56,0.64,1)]",
                toast.type === "success" ? "border-success/20" : "border-danger/20"
            )}
        >
            <div className="flex items-center gap-4 px-5 py-4">
                <div className={clsx(
                    "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner",
                    toast.type === "success" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                )}>
                    {toast.type === "success" ? (
                        <CheckCircle2 className="w-5 h-5" />
                    ) : (
                        <AlertCircle className="w-5 h-5" />
                    )}
                </div>

                <div className="flex flex-col gap-0.5 flex-grow pr-2">
                    <span className="text-[11px] font-bold uppercase tracking-widest opacity-50">
                        {toast.type === "success" ? "Success" : "System Error"}
                    </span>
                    <p className="text-sm font-medium text-foreground leading-snug">
                        {toast.message}
                    </p>
                </div>

                <button
                    onClick={handleRemove}
                    className="text-muted-foreground hover:text-foreground hover:bg-white/[0.05] p-2 rounded-lg transition-all"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
            
            {/* Progress Bar */}
            <div className="h-1 w-full bg-white/[0.02]">
                <div 
                    className={clsx(
                        "h-full transition-all duration-[4000ms] ease-linear",
                        toast.type === "success" ? "bg-success" : "bg-danger"
                    )}
                    style={{ width: "100%", animation: "shrink 4s linear forwards" }}
                />
            </div>

            <style jsx>{`
                @keyframes shrink {
                    from { width: 100%; }
                    to { width: 0%; }
                }
            `}</style>
        </div>
    );
}
