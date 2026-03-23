import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { uploadDocument, updateDocument, Document } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@clerk/nextjs";

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

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !category || !content) {
            setError("All fields are required");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const token = await getToken();
            if (initialData?.id) {
                await updateDocument(initialData.id, title, content, category, token || undefined);
                showToast("Document updated successfully", "success");
            } else {
                await uploadDocument(title, content, category, token || undefined);
                showToast("Document uploaded successfully", "success");
            }
            onSuccess();
            onClose();
            // Reset form if it was an upload
            if (!initialData) {
                setTitle("");
                setCategory("");
                setContent("");
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to save document";
            setError(msg);
            showToast(msg, "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-[#1A1A1A] border border-border w-full max-w-lg rounded-xl shadow-lg p-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-white">
                        {initialData ? "Edit SOP" : "Upload New SOP"}
                    </h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg mb-4 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Title *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Password Reset Procedure"
                            className="w-full bg-[#0F0F0F] border border-border rounded-lg px-3 py-2 text-white placeholder:text-muted-foreground focus:ring-1 focus:ring-primary outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Category *</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full bg-[#0F0F0F] border border-border rounded-lg px-3 py-2 text-white outline-none focus:ring-1 focus:ring-primary appearance-none"
                        >
                            <option value="">Select category...</option>
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Content *</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Paste your SOP content here..."
                            rows={6}
                            className="w-full bg-[#0F0F0F] border border-border rounded-lg px-3 py-2 text-white placeholder:text-muted-foreground focus:ring-1 focus:ring-primary outline-none resize-none"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {initialData ? "Save Changes" : "Upload Document"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
