"use client";

import { useEffect, useState } from "react";
import { X, Loader2, FilePlus2, Sparkles, Hash, LayoutGrid, Type, ShieldCheck, Zap, Navigation } from "lucide-react";
import { uploadDocument, updateDocument, Document } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@clerk/nextjs";
import { useOrgId } from "@/hooks/useOrgId";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: Document | null;
}

const CATEGORIES = ["HR", "IT Security", "Engineering", "Finance", "Operations"];

export default function UploadModal({ isOpen, onClose, onSuccess, initialData }: Props) {
    const { showToast } = useToast();
    const { getToken } = useAuth();
    const { orgId } = useOrgId();
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("");
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (initialData) {
            setTitle(initialData.title);
            setCategory(initialData.category);
            setContent(initialData.content);
        } else {
            setTitle("");
            setCategory("");
            setContent("");
        }
    }, [initialData, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !category || !content) {
            setError("All neural clusters must be populated.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const token = await getToken();
            if (!orgId) {
                throw new Error("Organisation context not found. Please refresh or select an organisation.");
            }
            if (initialData?.id) {
                await updateDocument(initialData.id, title, content, category, token || undefined, orgId);
                showToast(`Asset "${title}" synchronization complete.`, "success");
            } else {
                await uploadDocument(title, content, category, token || undefined, orgId);
                showToast(`Asset "${title}" successfully injected into neural base.`, "success");
            }
            onSuccess();
            onClose();
            if (!initialData) {
                setTitle("");
                setCategory("");
                setContent("");
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Neural injection sequence failed.";
            setError(msg);
            showToast(msg, "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 md:p-12 overflow-y-auto custom-scrollbar pt-[10vh]">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-[var(--bg-overlay)] backdrop-blur-xl pointer-events-auto"
                    />
                    
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 60, filter: "blur(20px)" }}
                        animate={{ scale: 1, opacity: 1, y: 0, filter: "blur(0px)" }}
                        exit={{ scale: 0.95, opacity: 0, y: 30, filter: "blur(10px)" }}
                        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                        className="w-full max-w-3xl relative pointer-events-auto"
                    >
                        <div className="rounded-[3.0rem] glass-strong shadow-[0_40px_120px_rgba(0,0,0,0.5)] overflow-hidden relative ring-1 ring-white/10">
                            {/* Decorative Background */}
                            <div className="absolute top-0 right-0 w-80 h-80 bg-[var(--brand-glow)] blur-[6.25rem] opacity-20 pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-[var(--success-soft)] blur-[6.25rem] opacity-10 pointer-events-none" />

                            <form onSubmit={handleSubmit} className="relative z-10">
                                {/* Header */}
                                <div className="px-10 py-10 md:px-16 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--surface-2)]/40 backdrop-blur-md">
                                    <div className="space-y-2 md:space-y-3">
                                        <div className="flex items-center gap-4 md:gap-5">
                                            <div className="w-12 h-12 md:w-16 md:h-16 rounded-[1.125rem] md:rounded-[1.5rem] bg-gradient-to-br from-[var(--brand)] to-[var(--persian-green-600)] flex items-center justify-center text-white shadow-xl shadow-[var(--brand-glow)]">
                                                <Sparkles className="w-6 h-6 md:w-8 md:h-8" />
                                            </div>
                                            <h2 className="text-2xl md:text-5xl font-bold text-[var(--text-primary)] tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                                                {initialData ? "Recalibrate" : "Inject Knowledge"}
                                            </h2>
                                        </div>
                                        <div className="flex items-center gap-2 ml-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--brand)] animate-pulse" />
                                            <p className="text-[clamp(0.45rem,0.9vw,0.5625rem)] md:text-[clamp(0.55rem,1.1vw,0.6875rem)] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] md:tracking-[0.3em]">Neural Asset Synchronization Protocol v3.1</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-[var(--surface-3)]/50 border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-1)] hover:border-[var(--brand)] transition-all active:scale-90"
                                    >
                                        <X className="w-5 h-5 md:w-7 md:h-7" />
                                    </button>
                                </div>

                                <div className="p-10 md:p-14 space-y-10">
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="p-5 bg-[var(--danger-soft)] border border-[var(--danger-ring)] text-[var(--danger)] text-[clamp(0.55rem,1.1vw,0.6875rem)] font-bold uppercase tracking-widest flex items-center gap-4 rounded-[1.25rem]"
                                        >
                                            <ShieldCheck className="w-5 h-5 flex-shrink-0 animate-pulse" />
                                            {error}
                                        </motion.div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12">
                                        <div className="space-y-3 md:space-y-4">
                                            <label className="text-[clamp(0.55rem,1.1vw,0.6875rem)] md:text-[clamp(0.6rem,1.2vw,0.75rem)] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-2">Knowledge Identifier</label>
                                            <div className="relative group">
                                                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--brand)] transition-colors">
                                                    <Type className="w-5 h-5" />
                                                </div>
                                                <input
                                                    value={title}
                                                    onChange={(e) => setTitle(e.target.value)}
                                                    placeholder="Assign neural label..."
                                                    className="w-full h-14 md:h-18 bg-[var(--surface-2)]/50 border border-[var(--border-default)] rounded-2xl md:rounded-[1.75rem] pl-16 pr-6 py-4 text-base md:text-lg font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/30 focus:outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)] hover:border-[var(--brand-glow)] transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-3 md:space-y-4">
                                            <label className="text-[clamp(0.55rem,1.1vw,0.6875rem)] md:text-[clamp(0.6rem,1.2vw,0.75rem)] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-2">Strategic Sector</label>
                                            <div className="relative group">
                                                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--brand)] transition-colors">
                                                    <LayoutGrid className="w-5 h-5" />
                                                </div>
                                                <select
                                                    value={category}
                                                    onChange={(e) => setCategory(e.target.value)}
                                                    className="w-full h-14 md:h-18 bg-[var(--surface-2)]/50 border border-[var(--border-default)] rounded-2xl md:rounded-[1.75rem] pl-16 pr-10 text-base md:text-lg font-bold text-[var(--text-primary)] appearance-none focus:outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)] transition-all outline-none cursor-pointer hover:border-[var(--brand-glow)]"
                                                >
                                                    <option value="" className="bg-[var(--surface-1)]">Unassigned Domain</option>
                                                    {CATEGORIES.map(c => <option key={c} value={c} className="bg-[var(--surface-1)] text-base">{c}</option>)}
                                                </select>
                                                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)] group-hover:text-[var(--brand)] transition-colors">
                                                    <ChevronDown className="w-5 h-5 md:w-6 md:h-6" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3 md:space-y-4">
                                        <div className="flex items-center justify-between px-2">
                                            <label className="text-[clamp(0.55rem,1.1vw,0.6875rem)] md:text-[clamp(0.6rem,1.2vw,0.75rem)] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] flex items-center gap-3">
                                                <Hash className="w-4 h-4 md:w-5 md:h-5 text-[var(--brand)]" />
                                                Neural Substrate Content
                                            </label>
                                            <span className="text-[clamp(0.4rem,0.8vw,0.5rem)] md:text-[clamp(0.5rem,1.0vw,0.625rem)] font-bold text-[var(--brand)] uppercase tracking-widest bg-[var(--brand-soft)] px-3 py-1 rounded-full border border-[var(--brand-glow)]">Vector Substrate Alpha</span>
                                        </div>
                                        <textarea
                                            value={content}
                                            onChange={(e) => setContent(e.target.value)}
                                            placeholder="Synthesize or paste intelligence dataset here..."
                                            rows={6}
                                            className="w-full bg-[var(--surface-2)]/50 border border-[var(--border-default)] rounded-2xl md:rounded-[2.0rem] px-6 md:px-8 py-6 md:py-8 text-base md:text-lg font-medium text-[var(--text-secondary)] placeholder:text-[var(--text-muted)]/30 focus:outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)] outline-none resize-none tracking-tight leading-relaxed transition-all hover:border-[var(--brand-glow)]"
                                        />
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-10 border-t border-[var(--border-subtle)]">
                                        <p className="text-[clamp(0.5rem,1.0vw,0.625rem)] font-bold text-[var(--text-muted)] uppercase tracking-widest italic max-w-xs text-center sm:text-left opacity-60">
                                           * Synchronization process includes recursive indexing and vector substrate validation.
                                        </p>
                                        <div className="flex items-center gap-4 w-full sm:w-auto">
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                onClick={onClose}
                                                className="flex-1 sm:flex-none h-14 px-10 rounded-2xl text-[clamp(0.55rem,1.1vw,0.6875rem)] font-bold tracking-widest uppercase border-2"
                                            >
                                                Abort
                                            </Button>
                                            <Button
                                                type="submit"
                                                className="flex-1 sm:flex-none h-14 px-12 rounded-2xl bg-[var(--brand)] text-white text-[clamp(0.55rem,1.1vw,0.6875rem)] font-bold tracking-widest uppercase hover:bg-[var(--brand-hover)] shadow-2xl shadow-[var(--brand-soft)] gap-3"
                                            >
                                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 text-white" />}
                                                {initialData ? "Update Asset" : "Inject Substrate"}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

function ChevronDown({className}: {className?: string}) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m6 9 6 6 6-6"/></svg>
    );
}
