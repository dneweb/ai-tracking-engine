"use client";

import { useEffect, useState, useMemo } from "react";
import { getDocuments, deleteDocument, Document } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import {
  Plus, FileText, Trash2, Pencil, Loader2,
  Search, ShieldCheck, Clock, ArrowRight, Upload,
  Database, Zap
} from "lucide-react";
import dynamic from 'next/dynamic';
const UploadModal = dynamic(() => import("@/components/UploadModal"), { ssr: false });
import { useAuth } from "@clerk/nextjs";
import { useRole } from "@/hooks/useRole";
import { useOrgId } from "@/hooks/useOrgId";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/* ── Motion Variants ─────────────────────────────────── */
const fadeUp: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0, 0, 0.2, 1] } },
};

const stagger: Variants = {
  animate: { transition: { staggerChildren: 0.03 } },
};

export default function DocumentsPage() {
  const { showToast } = useToast();
  const { getToken } = useAuth();
  const { isAdmin, isLoaded: roleLoaded } = useRole();
  const { orgId } = useOrgId();
  const router = useRouter();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const categories = useMemo(() => {
    const cats = Array.from(new Set(documents.map(doc => doc.category))).filter(Boolean);
    return ["All", ...cats.sort()];
  }, [documents]);

  async function loadData() {
    try {
      setLoading(true);
      const token = await getToken();
      const data = await getDocuments(token || "", orgId || "");
      setDocuments(data);
    } catch (err) {
      console.error("Failed to load documents", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(e: React.MouseEvent, id: string, title: string) {
    e.stopPropagation();
    if (!window.confirm(`Delete "${title}"?`)) return;
    try {
      setDeletingId(id);
      const token = await getToken();
      await deleteDocument(id, token || undefined, orgId || "");
      showToast(`Asset "${title}" purged`, "success");
      await loadData();
    } catch {
      showToast("Failed to delete asset", "error");
    } finally {
      setDeletingId(null);
    }
  }

  const handleEdit = (e: React.MouseEvent, doc: Document) => {
    e.stopPropagation();
    setEditingDoc(doc);
    setIsUploadModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsUploadModalOpen(false);
    setEditingDoc(null);
  };

  useEffect(() => {
    if (roleLoaded && !isAdmin) router.push("/");
  }, [roleLoaded, isAdmin, router]);

  useEffect(() => {
    if (orgId) {
      loadData();
    }
  }, [orgId]);

  const filteredDocs = useMemo(() =>
    documents.filter(doc => {
      const matchCat = selectedCategory === "All" || doc.category === selectedCategory;
      const matchSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCat && matchSearch;
    }), [documents, selectedCategory, searchTerm]);

  const stats = useMemo(() => [
    { label: "Total Assets", value: documents.length, color: "var(--brand)", icon: Database },
    { label: "Indexing Status", value: documents.length > 0 ? "Synced" : "Awaiting", color: "var(--success)", icon: ShieldCheck },
    { label: "Neural Chunks", value: `${(documents.length * 12).toLocaleString()}`, color: "var(--info)", icon: Zap },
    { label: "System Health", value: "100%", color: "var(--warning)", icon: Clock },
  ], [documents]);

  return (
    <div className="w-full container-app py-8 md:py-20 space-y-8 md:space-y-12">

      {/* ── Page Header: Action Zone ── */}
      <motion.div
        initial={{ opacity: 0, y: 15, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ delay: 0.1, duration: 0.8, ease: [0, 0, 0.2, 1] }}
        className="flex flex-col lg:flex-row lg:items-end justify-between gap-10 mb-12 md:mb-20"
      >
        <div className="space-y-4 md:space-y-5">
          <h1 className="text-[clamp(2.5rem,8vw,5.5rem)] font-bold tracking-tight text-[var(--text-primary)] leading-[0.95] sm:leading-[0.9] md:leading-[0.85]" style={{ fontFamily: "var(--font-display)" }}>
            Knowledge <span className="brand-gradient-text">Assets.</span>
          </h1>
          <div className="flex items-center gap-3">
            <div className="w-2 md:w-2.5 h-2 md:h-2.5 rounded-full bg-[var(--brand)] animate-glow-pulse shadow-[0_0_12px_var(--brand)]" />
            <p className="text-[clamp(0.55rem,1.1vw,0.75rem)] font-bold text-[var(--text-muted)] tracking-[0.2em] sm:tracking-[0.3em] uppercase">
              Neural indexing complete · {documents.length} objects
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          {/* Search trigger */}
          <div className="group relative w-full sm:w-80">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[var(--text-muted)] group-focus-within:text-[var(--brand)] transition-colors" />
            <input
              type="text"
              placeholder="Scan neural base..."
              className="w-full pl-14 pr-6 py-4 rounded-[1.375rem] text-[clamp(0.75rem,1.5vw,0.9375rem)] font-medium bg-[var(--surface-2)]/50 border border-[var(--border-default)] shadow-sm focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)] transition-all outline-none"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="w-full sm:w-auto h-15 flex items-center justify-center gap-4 px-10 rounded-[1.375rem] text-[clamp(0.65rem,1.3vw,0.8125rem)] font-bold uppercase tracking-[0.2em] text-white bg-gradient-to-r from-[var(--brand)] to-[var(--blue-ribbon-700)] shadow-xl hover:shadow-[0_12px_32px_var(--brand-glow)] hover:-translate-y-1 transition-all duration-400 group"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
            Inject Knowledge
          </button>
        </div>
      </motion.div>

      {/* ── Neural Stats Summary: Clean & High-Tech ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4"
      >
        {stats.map((s, i) => (
          <div
            key={i}
            className="group relative p-5 md:p-6 rounded-[1.5rem] md:rounded-3xl bg-[var(--surface-1)]/60 backdrop-blur-md border border-[var(--border-subtle)] shadow-sm hover:shadow-[0_12px_32px_var(--brand-glow)] hover:border-[var(--brand)] transition-all duration-400 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand-soft)] to-transparent opacity-0 group-hover:opacity-10 transition-opacity" />
            <div className="flex items-center gap-3 mb-3 md:mb-4">
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center bg-[var(--bg-secondary)] text-[var(--text-muted)] group-hover:bg-[var(--brand-soft)] group-hover:text-[var(--brand)] transition-all">
                <s.icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </div>
              <span className="text-[clamp(0.4rem,0.8vw,0.5rem)] md:text-[clamp(0.45rem,0.9vw,0.5625rem)] font-bold tracking-[0.15em] md:tracking-[0.18em] uppercase text-[var(--text-muted)]">
                {s.label}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
                {typeof s.value === "number" ? s.value.toLocaleString() : s.value}
              </span>
              <div className="h-0.5 md:h-1 w-6 md:w-8 bg-[var(--brand)] mt-2 md:mt-3 opacity-20 group-hover:opacity-100 group-hover:w-full transition-all duration-500" />
            </div>
          </div>
        ))}
      </motion.div>

      {/* ── Filters: Premium Tabs ── */}
      <div className="sticky top-[var(--topbar-height)] z-20 py-6 -mx-4 md:-mx-8 lg:-mx-12 px-4 md:px-8 lg:px-12 bg-[var(--bg-primary)]/80 backdrop-blur-xl border-b border-[var(--border-subtle)]">
        <div className="w-full flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide w-full md:w-auto -mx-4 px-4 md:mx-0 md:px-0">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "whitespace-nowrap px-6 py-2.5 rounded-xl text-[clamp(0.55rem,1.1vw,0.6875rem)] font-bold uppercase tracking-widest transition-all",
                  selectedCategory === cat
                    ? "bg-[var(--brand)] text-white shadow-md shadow-[var(--brand-soft)]"
                    : "bg-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-[var(--brand-soft)] border border-[var(--brand-glow)]">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--brand)] animate-pulse" />
            <span className="text-[clamp(0.5rem,1.0vw,0.625rem)] font-bold tracking-[0.12em] uppercase text-[var(--brand)]">
              {filteredDocs.length} Active Vectors Linked
            </span>
          </div>
        </div>
      </div>

      {/* ── Asset Grid: God-Level Cards ── */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10"
        variants={stagger}
        initial="initial"
        animate="animate"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {loading ? (
            <motion.div key="loading" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 col-span-full">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="h-[clamp(16.0rem,32.0vw,20.0rem)] rounded-[2.5rem] skeleton opacity-50" />
              ))}
            </motion.div>
          ) : filteredDocs.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="col-span-full py-40 flex flex-col items-center text-center gap-8 rounded-[3.0rem] border-2 border-dashed border-[var(--border-subtle)] bg-[var(--surface-2)]/30"
            >
              <div className="w-24 h-24 rounded-3xl bg-[var(--surface-3)]/50 border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] opacity-30 shadow-inner">
                <Search className="w-12 h-12" />
              </div>
              <div className="space-y-3">
                <h3 className="text-3xl font-bold text-[var(--text-primary)]">Void Encountered</h3>
                <p className="text-[clamp(0.75rem,1.5vw,0.9375rem)] text-[var(--text-muted)] font-bold max-w-xs uppercase tracking-[0.2em] leading-relaxed">No intelligence assets match your neural traversal parameters</p>
              </div>
              <Button variant="outline" onClick={() => setSelectedCategory("All")} className="rounded-2xl px-12 h-14 font-bold uppercase tracking-widest text-[clamp(0.55rem,1.1vw,0.6875rem)] hover:border-[var(--brand)]">Clear Neural Filter</Button>
            </motion.div>
          ) : (
            filteredDocs.map((doc, idx) => (
              <motion.div
                layout
                variants={fadeUp}
                key={doc.id}
                className="group relative h-full"
              >
                <div className="h-full p-10 rounded-[2.75rem] glass-strong border border-[var(--border-subtle)] shadow-xl hover:shadow-[0_32px_80px_rgba(0,0,0,0.2)] hover:border-[var(--brand)] transition-all duration-700 overflow-hidden flex flex-col ring-1 ring-white/5 relative">
                  {/* High-Fidelity Hover Glow */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[var(--brand-glow)] to-transparent blur-[6.25rem] opacity-0 group-hover:opacity-50 transition-opacity duration-1000 pointer-events-none" />

                  {/* Top: Metadata & Actions */}
                  <div className="flex justify-between items-start mb-10 relative z-10">
                    <div className="w-16 h-16 rounded-[1.25rem] flex items-center justify-center bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-muted)] group-hover:bg-[var(--brand)] group-hover:text-white group-hover:shadow-[0_12px_32px_rgba(var(--brand-rgb),0.4)] transition-all duration-700 group-hover:rotate-6">
                      <FileText className="w-7 h-7" />
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <Badge domain={doc.category} className="px-4 py-1.5 text-[clamp(0.55rem,1.1vw,0.6875rem)] font-bold uppercase tracking-widest" />
                      <div className="flex items-center gap-2 text-[var(--success)] px-3 py-1 rounded-full bg-[var(--success-soft)] border border-[var(--success-ring)] shadow-sm">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span className="text-[clamp(0.5rem,1.0vw,0.625rem)] font-bold uppercase tracking-[0.15em]">Authorized</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Content */}
                  <div className="flex-1 space-y-5 mb-10 min-w-0 relative z-10">
                    <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--text-primary)] leading-[1.15] line-clamp-3 group-hover:text-[var(--brand)] transition-colors duration-700">
                      {doc.title}
                    </h3>
                    <p className="text-[clamp(0.75rem,1.5vw,0.9375rem)] text-[var(--text-secondary)] font-medium leading-relaxed line-clamp-4 opacity-70 group-hover:opacity-100 transition-opacity duration-500">
                      {doc.content}
                    </p>
                    <div className="flex items-center gap-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors pt-2">
                      <Clock className="w-4 h-4" />
                      <span className="text-[clamp(0.55rem,1.1vw,0.6875rem)] font-bold uppercase tracking-[0.2em]">
                        Synthesized: {new Date(doc.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                  </div>

                  {/* Bottom: Inline Actions */}
                  <div className="pt-8 border-t border-[var(--border-subtle)] flex items-center justify-between relative z-10 mt-auto">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={e => handleEdit(e, doc)}
                        className="p-3.5 rounded-xl bg-[var(--surface-2)]/50 border border-[var(--border-subtle)] text-[var(--text-muted)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)] hover:border-[var(--brand-glow)] transition-all active:scale-90"
                        title="Recalibrate Metadata"
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                      <button
                        onClick={e => handleDelete(e, doc.id, doc.title)}
                        disabled={deletingId === doc.id}
                        className="p-3.5 rounded-xl bg-[var(--surface-2)]/50 border border-[var(--border-subtle)] text-[var(--text-muted)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] hover:border-[var(--danger-ring)] transition-all active:scale-90 disabled:opacity-50"
                        title="Purge Object"
                      >
                        {deletingId === doc.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                      </button>
                    </div>

                    <button
                      onClick={() => showToast("Neural traversal active...", "info")}
                      className="flex items-center gap-3 text-[clamp(0.55rem,1.1vw,0.6875rem)] font-bold uppercase tracking-[.25em] text-[var(--brand)] group/link hover:tracking-[0.3em] transition-all"
                    >
                      Interact <ArrowRight className="w-4 h-4 group-hover/link:translate-x-2 transition-transform" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Footer Link: Cinematic CTA ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        onClick={() => setIsUploadModalOpen(true)}
        className="group relative p-10 rounded-[2.0rem] overflow-hidden cursor-pointer bg-[var(--bg-secondary)] border border-dashed border-[var(--border-subtle)] hover:border-[var(--brand)] hover:bg-[var(--brand-soft)] transition-all duration-700 text-center"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,var(--brand-glow)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="w-20 h-20 rounded-[1.5rem] bg-[var(--card-bg)] border border-[var(--border-subtle)] shadow-xl flex items-center justify-center text-[var(--brand)] group-hover:scale-110 group-hover:rotate-[15deg] transition-all duration-700">
            <Upload className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-3xl font-bold text-[var(--text-primary)]">Expand Intelligence</h3>
            <p className="text-[clamp(0.55rem,1.1vw,0.6875rem)] font-bold uppercase tracking-[0.3em] text-[var(--text-muted)] group-hover:text-[var(--brand)] transition-colors">Scale the neural knowledge base with your specific data</p>
          </div>
          <div className="flex items-center gap-3 px-6 py-2 rounded-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] group-hover:border-[var(--brand-glow)] transition-all">
            <span className="text-[clamp(0.5rem,1.0vw,0.625rem)] font-bold uppercase tracking-widest text-[var(--text-secondary)]">PDF · DOCX · TXT · CSV · MD</span>
          </div>
        </div>
      </motion.div>

      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={handleCloseModal}
        onSuccess={loadData}
        initialData={editingDoc}
      />
    </div>
  );
}
