"use client";

import { useState, useRef, useEffect } from "react";
import { Download, FileJson, FileSpreadsheet, FileText } from "lucide-react";
import type { Query, Document } from "@/lib/api";

interface ExportButtonProps {
    queries: Query[];
    documents: Document[];
}

export default function ExportButton({ queries, documents }: ExportButtonProps) {
    const [open, setOpen] = useState(false);
    const [exporting, setExporting] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    function downloadBlob(blob: Blob, filename: string) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async function exportCSV() {
        setExporting("csv");
        try {
            const header = "Question,Confidence,Date,Category,Source\n";
            const rows = queries
                .map(
                    (q) =>
                        `"${q.question.replace(/"/g, '""')}",${q.confidence},${q.date},"${q.category}","${q.source}"`
                )
                .join("\n");
            const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
            downloadBlob(blob, `analytics-export-${new Date().toISOString().split("T")[0]}.csv`);
        } finally {
            setExporting(null);
            setOpen(false);
        }
    }

    async function exportJSON() {
        setExporting("json");
        try {
            const data = {
                exported_at: new Date().toISOString(),
                total_queries: queries.length,
                total_documents: documents.length,
                avg_confidence:
                    queries.length > 0
                        ? Math.round(queries.reduce((a, q) => a + q.confidence, 0) / queries.length)
                        : 0,
                queries: queries.map((q) => ({
                    question: q.question,
                    confidence: q.confidence,
                    date: q.date,
                    category: q.category,
                    source: q.source,
                })),
                documents: documents.map((d) => ({
                    title: d.title,
                    category: d.category,
                    created_at: d.created_at,
                })),
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: "application/json",
            });
            downloadBlob(blob, `analytics-export-${new Date().toISOString().split("T")[0]}.json`);
        } finally {
            setExporting(null);
            setOpen(false);
        }
    }

    async function exportPDF() {
        setExporting("pdf");
        try {
            const { jsPDF } = await import("jspdf");
            const { default: autoTable } = await import("jspdf-autotable");

            const doc = new jsPDF();

            doc.setFontSize(18);
            doc.setTextColor(80, 80, 80);
            doc.text("AI Tracking Engine — Analytics Report", 14, 20);

            doc.setFontSize(10);
            doc.setTextColor(120, 120, 120);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

            doc.setFontSize(12);
            doc.setTextColor(60, 60, 60);
            doc.text("Summary", 14, 40);

            const avgConf =
                queries.length > 0
                    ? Math.round(
                          queries.reduce((a, q) => a + q.confidence, 0) / queries.length
                      )
                    : 0;

            autoTable(doc, {
                startY: 44,
                head: [["Metric", "Value"]],
                body: [
                    ["Total Queries", String(queries.length)],
                    ["Total Documents", String(documents.length)],
                    ["Average Confidence", `${avgConf}%`],
                ],
                theme: "grid",
                headStyles: { fillColor: [124, 58, 237] },
                margin: { left: 14, right: 14 },
            });

            const afterSummary = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? 80;

            doc.setFontSize(12);
            doc.text("Low Confidence Questions (Top 10)", 14, afterSummary + 10);

            const lowConf = queries
                .filter((q) => q.confidence < 50)
                .sort((a, b) => a.confidence - b.confidence)
                .slice(0, 10);

            autoTable(doc, {
                startY: afterSummary + 14,
                head: [["Question", "Confidence", "Date", "Category"]],
                body: lowConf.map((q) => [
                    q.question.length > 60 ? q.question.slice(0, 60) + "..." : q.question,
                    `${q.confidence}%`,
                    new Date(q.date).toLocaleDateString(),
                    q.category,
                ]),
                theme: "grid",
                headStyles: { fillColor: [124, 58, 237] },
                margin: { left: 14, right: 14 },
                columnStyles: { 0: { cellWidth: 80 } },
            });

            doc.save(`analytics-report-${new Date().toISOString().split("T")[0]}.pdf`);
        } catch (err) {
            console.error("PDF export failed", err);
        } finally {
            setExporting(null);
            setOpen(false);
        }
    }

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setOpen(!open)}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-primary/20 active:scale-95"
            >
                <Download className="w-4 h-4" />
                Export
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-48 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-xl z-50 overflow-hidden">
                    <button
                        onClick={exportCSV}
                        disabled={!!exporting}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-white/5 transition-colors disabled:opacity-50"
                    >
                        <FileSpreadsheet className="w-4 h-4 text-green-400" />
                        {exporting === "csv" ? "Exporting..." : "Export as CSV"}
                    </button>
                    <button
                        onClick={exportPDF}
                        disabled={!!exporting}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-white/5 transition-colors disabled:opacity-50"
                    >
                        <FileText className="w-4 h-4 text-red-400" />
                        {exporting === "pdf" ? "Exporting..." : "Export as PDF"}
                    </button>
                    <button
                        onClick={exportJSON}
                        disabled={!!exporting}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-white/5 transition-colors disabled:opacity-50"
                    >
                        <FileJson className="w-4 h-4 text-blue-400" />
                        {exporting === "json" ? "Exporting..." : "Export as JSON"}
                    </button>
                </div>
            )}
        </div>
    );
}
