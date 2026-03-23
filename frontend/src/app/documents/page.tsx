"use client";

import { useEffect, useState } from "react";
import { getDocuments, deleteDocument, Document } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { Plus, FileText, Trash2, Pencil, Loader2, Filter, Search, ExternalLink, ShieldCheck, Clock, Archive } from "lucide-react";
import CategoryBadge from "@/components/CategoryBadge";
import UploadModal from "@/components/UploadModal";
import { useAuth } from "@clerk/nextjs";
import { useRole } from "@/hooks/useRole";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const CATEGORIES = ["All", "HR", "IT Security", "Engineering", "Finance", "Operations"];

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
        if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;

        try {
            setDeletingId(id);
            const token = await getToken();
            await deleteDocument(id, token || undefined);
            showToast(`"${title}" deleted successfully`, "success");
            await loadData();
        } catch (err) {
            showToast("Failed to delete document", "error");
            console.error(err);
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
        if (roleLoaded && !isAdmin) {
            router.push("/ask-question");
        }
    }, [roleLoaded, isAdmin, router]);

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filteredDocs = documents.filter(doc => {
        const matchesCategory = selectedCategory === "All" || doc.category === selectedCategory;
        const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Knowledge Base</h1>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] opacity-70">Manage core company intelligence sources</p>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="relative group/search hidden lg:block">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within/search:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Filter knowledge..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white/[0.03] border border-white/[0.05] focus:border-primary/50 rounded-2xl pl-11 pr-4 py-3 text-sm font-medium text-foreground placeholder:text-muted-foreground transition-all outline-none w-64 focus:w-80"
                        />
                    </div>
                    <button
                        onClick={() => setIsUploadModalOpen(true)}
                        className="group flex items-center gap-2.5 px-8 py-3.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold uppercase tracking-widest rounded-2xl transition-all shadow-2xl shadow-primary/20"
                    >
                        <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                        Inject Knowledge
                    </button>
                </div>
            </div>

            {/* Filter Navigation */}
            <div className="flex flex-col lg:flex-row gap-6 items-center justify-between pb-2 border-b border-white/[0.05]">
                <div className="flex flex-wrap gap-2 items-center w-full lg:w-auto">
                    <div className="p-2 bg-white/[0.03] border border-white/[0.05] rounded-xl text-primary mr-2">
                        <Filter className="w-5 h-5" />
                    </div>
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={cn(
                                "px-5 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all",
                                selectedCategory === cat
                                    ? "bg-white text-background shadow-lg shadow-white/10"
                                    : "text-muted-foreground hover:text-white hover:bg-white/[0.05]"
                            )}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
                
                <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    <span className="tabular-nums text-foreground">{filteredDocs.length}</span> Assets Identified
                </div>
            </div>

            {/* Content Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="glass rounded-[2rem] p-8 h-[240px] animate-pulse">
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-12 h-12 bg-white/[0.05] rounded-xl" />
                                <div className="w-20 h-6 bg-white/[0.05] rounded-lg" />
                            </div>
                            <div className="space-y-3">
                                <div className="w-full h-6 bg-white/[0.05] rounded-lg" />
                                <div className="w-2/3 h-6 bg-white/[0.05] rounded-lg" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : filteredDocs.length === 0 ? (
                <div className="glass border border-white/[0.05] rounded-[3rem] p-32 text-center">
                    <div className="w-20 h-20 bg-white/[0.03] text-muted-foreground rounded-3xl flex items-center justify-center mx-auto mb-8">
                        <Search className="w-10 h-10 opacity-20" />
                    </div>
                    <h3 className="text-2xl font-bold font-display text-foreground mb-4">No Documentation Matches</h3>
                    <p className="text-muted-foreground max-w-md mx-auto text-base leading-relaxed font-medium">
                        Adjustment required. No assets were found matching your current filter criteria.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDocs.map((doc) => (
                        <div key={doc.id} className="group relative">
                            <div className="absolute -inset-0.5 bg-gradient-to-br from-primary/20 to-transparent rounded-[2.5rem] blur opacity-0 group-hover:opacity-100 transition duration-500" />
                            
                            <div className="relative glass rounded-[2rem] p-6 border border-white/[0.05] hover:border-white/20 transition-all shadow-xl overflow-hidden flex flex-col justify-between h-[240px]">
                                <div className="flex justify-between items-start">
                                    <div className="p-4 bg-white/[0.03] ring-1 ring-white/10 rounded-2xl text-foreground group-hover:scale-110 group-hover:bg-primary/10 group-hover:text-primary transition-all duration-300">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <CategoryBadge category={doc.category} />
                                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-success/10 text-success border border-success/20 scale-90">
                                            <ShieldCheck className="w-3 h-3" />
                                            <span className="text-[8px] font-bold uppercase tracking-widest">Verified</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h3 className="text-xl font-bold font-display text-foreground leading-tight group-hover:text-primary transition-colors line-clamp-2" title={doc.title}>
                                        {doc.title}
                                    </h3>
                                    <div className="flex items-center gap-4 pt-4 border-t border-white/[0.05]">
                                        <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                                            <Clock className="w-3 h-3" />
                                            {new Date(doc.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </div>
                                    </div>
                                </div>

                                {/* Action Overlay */}
                                <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                    <button
                                        onClick={(e) => handleEdit(e, doc)}
                                        className="p-3 bg-white/10 hover:bg-primary/20 text-white rounded-xl backdrop-blur-md border border-white/20 transition-all hover:scale-105"
                                        title="Modify Configuration"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(e) => handleDelete(e, doc.id, doc.title)}
                                        disabled={deletingId === doc.id}
                                        className="p-3 bg-white/10 hover:bg-danger/20 text-white rounded-xl backdrop-blur-md border border-white/20 transition-all hover:scale-105 disabled:opacity-50"
                                        title="Purge Asset"
                                    >
                                        {deletingId === doc.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                                
                                <button className="absolute bottom-6 right-8 text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-0 translate-x-4 transition-all duration-300">
                                    <ExternalLink className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <UploadModal
                isOpen={isUploadModalOpen}
                onClose={handleCloseModal}
                onSuccess={loadData}
                initialData={editingDoc}
            />
        </div>
    );
}
