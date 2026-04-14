"use client";

import { useEffect, useState } from "react";
import { X, Loader2, FilePlus2, Sparkles, Hash, LayoutGrid, Type, ShieldCheck, Zap, Navigation } from "lucide-react";
import { uploadDocument, updateDocument, Document } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@clerk/nextjs";
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
            if (initialData?.id) {
                await updateDocument(initialData.id, title, content, category, token || undefined);
                showToast(`Asset "${title}" synchronization complete.`, "success");
            } else {
                await uploadDocument(title, content, category, token || undefined);
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
                        initial={{ scale: 0.95, opacity: 0, y: 40 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ duration: 0.6, ease: [0.19, 1, 0.22, 1] }}
                        className="w-full max-w-3xl relative pointer-events-auto"
                    >
                        <div className="rounded-[48px] bg-[var(--card-bg)] border border-[var(--border-strong)] shadow-[0_40px_100px_rgba(0,0,0,0.4)] overflow-hidden relative">
                            {/* Decorative Background */}
                            <div className="absolute top-0 right-0 w-80 h-80 bg-[var(--brand-glow)] blur-[100px] opacity-20 pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-[var(--success-soft)] blur-[100px] opacity-10 pointer-events-none" />

                            <form onSubmit={handleSubmit} className="relative z-10">
                                {/* Header */}
                                <div className="px-10 py-10 md:px-14 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-secondary)]/30">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-3xl bg-[var(--brand-soft)] border border-[var(--brand-glow)] flex items-center justify-center text-[var(--brand)] shadow-sm">
                                                <Sparkles className="w-7 h-7" />
                                            </div>
                                            <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                                                {initialData ? "Recalibrate Asset" : "Inject Knowledge"}
                                            </h2>
                                        </div>
                                        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.3em] ml-2">Neural Asset Synchronization v3.0</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="w-12 h-12 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-all"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="p-10 md:p-14 space-y-10">
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="p-5 bg-[var(--danger-soft)] border border-[var(--danger-ring)] text-[var(--danger)] text-[11px] font-bold uppercase tracking-widest flex items-center gap-4 rounded-[20px]"
                                        >
                                            <ShieldCheck className="w-5 h-5 flex-shrink-0 animate-pulse" />
                                            {error}
                                        </motion.div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="space-y-4">
                                            <label className="text-[11px] font-extrabold text-[var(--text-muted)] uppercase tracking-[0.3em] ml-2">Knowledge Title</label>
                                            <div className="relative group">
                                                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--brand)] transition-colors">
                                                    <Type className="w-5 h-5" />
                                                </div>
                                                <input
                                                    value={title}
                                                    onChange={(e) => setTitle(e.target.value)}
                                                    placeholder="Assign neural label..."
                                                    className="w-full h-16 bg-[var(--input-bg)] border border-[var(--border-default)] rounded-[24px] pl-16 pr-6 py-4 text-base font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/30 focus:outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)] transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="text-[11px] font-extrabold text-[var(--text-muted)] uppercase tracking-[0.3em] ml-2">Sector Domain</label>
                                            <div className="relative group">
                                                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--brand)] transition-colors">
                                                    <LayoutGrid className="w-5 h-5" />
                                                </div>
                                                <select
                                                    value={category}
                                                    onChange={(e) => setCategory(e.target.value)}
                                                    className="w-full h-16 bg-[var(--input-bg)] border border-[var(--border-default)] rounded-[24px] pl-16 pr-10 text-base font-bold text-[var(--text-primary)] appearance-none focus:outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)] transition-all outline-none cursor-pointer"
                                                >
                                                    <option value="" className="bg-[var(--card-bg)]">Unassigned Domain</option>
                                                    {CATEGORIES.map(c => <option key={c} value={c} className="bg-[var(--card-bg)] text-base">{c}</option>)}
                                                </select>
                                                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]">
                                                    <ChevronDown className="w-5 h-5" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between px-2">
                                            <label className="text-[11px] font-extrabold text-[var(--text-muted)] uppercase tracking-[0.3em] flex items-center gap-3">
                                                <Hash className="w-4 h-4 text-[var(--brand)]" />
                                                Substrate Content Data
                                            </label>
                                            <span className="text-[9px] font-bold text-[var(--text-muted)] opacity-30 uppercase">Vector Encoding Active</span>
                                        </div>
                                        <textarea
                                            value={content}
                                            onChange={(e) => setContent(e.target.value)}
                                            placeholder="Synthesize or paste intelligence dataset here..."
                                            rows={8}
                                            className="w-full bg-[var(--input-bg)] border border-[var(--border-default)] rounded-[32px] px-8 py-8 text-base font-medium text-[var(--text-secondary)] placeholder:text-[var(--text-muted)]/30 focus:outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)] outline-none resize-none tracking-tight leading-relaxed transition-all"
                                        />
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-10 border-t border-[var(--border-subtle)]">
                                        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest italic max-w-xs text-center sm:text-left opacity-60">
                                           * Synchronization process includes recursive indexing and vector substrate validation.
                                        </p>
                                        <div className="flex items-center gap-4 w-full sm:w-auto">
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                onClick={onClose}
                                                className="flex-1 sm:flex-none h-14 px-10 rounded-2xl text-[11px] font-bold tracking-widest uppercase border-2"
                                            >
                                                Abort
                                            </Button>
                                            <Button
                                                type="submit"
                                                className="flex-1 sm:flex-none h-14 px-12 rounded-2xl bg-[var(--brand)] text-white text-[11px] font-bold tracking-widest uppercase hover:bg-[var(--brand-hover)] shadow-2xl shadow-[var(--brand-soft)] gap-3"
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
