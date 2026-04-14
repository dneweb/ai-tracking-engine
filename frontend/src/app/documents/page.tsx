"use client";

import { useEffect, useState, useMemo } from "react";
import { getDocuments, deleteDocument, Document } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import {
  Plus, FileText, Trash2, Pencil, Loader2,
  Search, ShieldCheck, Clock, ArrowRight, Upload,
  Database, Zap
} from "lucide-react";
import UploadModal from "@/components/UploadModal";
import { useAuth } from "@clerk/nextjs";
import { useRole } from "@/hooks/useRole";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const CATEGORIES = ["All", "HR", "IT Security", "Engineering", "Finance", "Operations"];

/* ── Motion Variants ─────────────────────────────────── */
const fadeUp: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.19, 1, 0.22, 1] } },
};

const stagger: Variants = {
  animate: { transition: { staggerChildren: 0.06 } },
};

export default function DocumentsPage() {
  const { showToast } = useToast();
  const { getToken } = useAuth();
  const { isAdmin, isLoaded: roleLoaded } = useRole();
  const router = useRouter();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      const token = await getToken();
      const data = await getDocuments(token || undefined);
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
      await deleteDocument(id, token || undefined);
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

  useEffect(() => { loadData(); }, []);

  const filteredDocs = useMemo(() =>
    documents.filter(doc => {
      const matchCat = selectedCategory === "All" || doc.category === selectedCategory;
      const matchSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCat && matchSearch;
    }), [documents, selectedCategory, searchTerm]);

  const stats = [
    { label: "Total Assets",     value: documents.length, color: "var(--brand)", icon: Database },
    { label: "Indexing Status",  value: "Syncing",        color: "var(--success)", icon: ShieldCheck },
    { label: "Neural Chunks",    value: "1.2M",           color: "var(--info)", icon: Zap },
    { label: "System Health",    value: "99.8%",          color: "var(--warning)", icon: Clock },
  ];

  return (
    <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-12 md:py-20 space-y-12">

      {/* ── Page Header: Action Zone ── */}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <motion.div variants={fadeUp} initial="initial" animate="animate">
          <h1 className="text-[clamp(2.5rem,8vw,4.5rem)] font-bold tracking-tight text-[var(--text-primary)]" style={{ fontFamily: "var(--font-display)" }}>
            Knowledge <span className="text-[var(--brand)]">Assets.</span>
          </h1>
          <p className="text-[13px] font-semibold text-[var(--text-muted)] tracking-widest uppercase mt-4 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[var(--brand)]" />
            Neural indexing complete · {documents.length} secure objects
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row items-center gap-4"
        >
          {/* Search trigger */}
          <div className="group relative w-full sm:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within:text-[var(--brand)] transition-colors" />
            <input
              type="text"
              placeholder="Scan neural base..."
              className="w-full pl-11 pr-4 py-3 rounded-2xl text-sm font-medium bg-[var(--input-bg)] border border-[var(--border-subtle)] focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)] transition-all outline-none"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-3.5 rounded-2xl text-[11px] font-bold uppercase tracking-[0.14em] text-white bg-[var(--brand)] hover:bg-[var(--brand-hover)] shadow-lg shadow-[var(--brand-soft)] transition-all active:scale-[0.97] group"
          >
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
            Inject Knowledge
          </button>
        </motion.div>
      </div>

      {/* ── Neural Stats Summary: Clean & High-Tech ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {stats.map((s, i) => (
          <div 
            key={i} 
            className="group relative p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--border-subtle)] shadow-[var(--card-shadow)] hover:border-[var(--brand-glow)] transition-all"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--bg-secondary)] text-[var(--text-muted)] group-hover:bg-[var(--brand-soft)] group-hover:text-[var(--brand)] transition-all">
                <s.icon className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-[var(--text-muted)]">
                {s.label}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">
                {typeof s.value === "number" ? s.value.toLocaleString() : s.value}
              </span>
              <div className="h-1 w-8 bg-[var(--brand)] mt-3 opacity-20 group-hover:opacity-100 group-hover:w-full transition-all duration-500" />
            </div>
          </div>
        ))}
      </motion.div>

      {/* ── Filters: Premium Tabs ── */}
      <div className="sticky top-[var(--topbar-height)] z-20 py-6 -mx-6 md:-mx-12 px-6 md:px-12 bg-[var(--bg-primary)]/80 backdrop-blur-xl border-b border-[var(--border-subtle)]">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide w-full md:w-auto -mx-4 px-4 md:mx-0 md:px-0">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "whitespace-nowrap px-6 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all",
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
            <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-[var(--brand)]">
              {filteredDocs.length} Active Vectors Linked
            </span>
          </div>
        </div>
      </div>

      {/* ── Asset Grid: God-Level Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence mode="popLayout" initial={false}>
          {loading ? (
            <motion.div key="loading" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 col-span-full">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="h-[280px] rounded-[32px] skeleton" />
              ))}
            </motion.div>
          ) : filteredDocs.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="col-span-full py-32 flex flex-col items-center text-center gap-6"
            >
               <div className="w-20 h-20 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] opacity-30">
                 <Search className="w-10 h-10" />
               </div>
               <div className="space-y-2">
                 <h3 className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: "var(--font-display)" }}>Void Encountered</h3>
                 <p className="text-[14px] text-[var(--text-muted)] font-medium max-w-xs uppercase tracking-widest">No intelligence assets match your neural filter</p>
               </div>
               <Button variant="outline" onClick={() => setSelectedCategory("All")} className="rounded-xl px-10">Clear Parameters</Button>
            </motion.div>
          ) : (
            <motion.div key="list" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 col-span-full">
              {filteredDocs.map((doc, idx) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1], delay: idx * 0.05 }}
                  key={doc.id}
                  className="group relative"
                >
                  <div className="h-full p-8 rounded-[32px] bg-[var(--card-bg)] border border-[var(--border-subtle)] shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-lg)] hover:border-[var(--brand)] transition-all duration-500 overflow-hidden flex flex-col">
                    {/* Subtle Background Glow on Hover */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--brand-glow)] blur-[60px] opacity-0 group-hover:opacity-40 transition-opacity" />

                    {/* Top: Metadata & Actions */}
                    <div className="flex justify-between items-start mb-8 relative z-10">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[var(--bg-secondary)] text-[var(--text-muted)] group-hover:bg-[var(--brand)] group-hover:text-white group-hover:shadow-[0_8px_24px_rgba(91,78,248,0.3)] transition-all duration-500">
                        <FileText className="w-6 h-6" />
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        <Badge domain={doc.category} />
                        <div className="flex items-center gap-1.5 text-[var(--success)]">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-bold uppercase tracking-widest">Authorized</span>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Content */}
                    <div className="flex-1 space-y-4 mb-8 min-w-0 relative z-10">
                      <h3 className="text-xl md:text-2xl font-bold tracking-tight text-[var(--text-primary)] leading-[1.2] line-clamp-3 group-hover:text-[var(--brand)] transition-colors duration-500" style={{ fontFamily: "var(--font-display)" }}>
                        {doc.title}
                      </h3>
                      <div className="flex items-center gap-3 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">
                          Sync: {new Date(doc.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                    </div>

                    {/* Bottom: Inline Actions */}
                    <div className="pt-6 border-t border-[var(--border-subtle)] flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-3">
                         <button
                           onClick={e => handleEdit(e, doc)}
                           className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)] hover:border-[var(--brand-glow)] transition-all active:scale-[0.85]"
                           title="Recalibrate Metadata"
                         >
                           <Pencil className="w-4 h-4" />
                         </button>
                         <button
                           onClick={e => handleDelete(e, doc.id, doc.title)}
                           disabled={deletingId === doc.id}
                           className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] hover:border-[var(--danger-ring)] transition-all active:scale-[0.85] disabled:opacity-50"
                           title="Purge Object"
                         >
                           {deletingId === doc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                         </button>
                      </div>

                      <button 
                        onClick={() => showToast("Interaction Interface coming in v3.1", "info" as any)}
                        className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-[var(--brand)] group/link"
                      >
                        Interact <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-1.5 transition-transform" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Footer Link: Cinematic CTA ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        onClick={() => setIsUploadModalOpen(true)}
        className="group relative p-10 rounded-[32px] overflow-hidden cursor-pointer bg-[var(--bg-secondary)] border border-dashed border-[var(--border-subtle)] hover:border-[var(--brand)] hover:bg-[var(--brand-soft)] transition-all duration-700 text-center"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,var(--brand-glow)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
        
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="w-20 h-20 rounded-[24px] bg-[var(--card-bg)] border border-[var(--border-subtle)] shadow-xl flex items-center justify-center text-[var(--brand)] group-hover:scale-110 group-hover:rotate-[15deg] transition-all duration-700">
            <Upload className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-3xl font-bold text-[var(--text-primary)]" style={{ fontFamily: "var(--font-display)" }}>Expand Intelligence</h3>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[var(--text-muted)] group-hover:text-[var(--brand)] transition-colors">Scale the neural knowledge base with your specific data</p>
          </div>
          <div className="flex items-center gap-3 px-6 py-2 rounded-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] group-hover:border-[var(--brand-glow)] transition-all">
             <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">PDF · DOCX · TXT · CSV · MD</span>
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
