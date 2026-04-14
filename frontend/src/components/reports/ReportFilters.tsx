"use client";

import { useState, useEffect } from "react";
import { SlidersHorizontal, Calendar, Target, Layers, ChevronDown, Zap, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ReportFiltersProps {
    days: number;
    confidenceThreshold: number;
    minClusterSize: number;
    onDaysChange: (days: number) => void;
    onThresholdChange: (threshold: number) => void;
    onMinClusterSizeChange: (size: number) => void;
    disabled?: boolean;
}

const TIME_OPTIONS = [
    { value: 7, label: "07 DAY SCAN" },
    { value: 14, label: "14 DAY SCAN" },
    { value: 30, label: "30 DAY SCAN" },
    { value: 90, label: "90 DAY SCAN" },
];

export default function ReportFilters({
    days,
    confidenceThreshold,
    minClusterSize,
    onDaysChange,
    onThresholdChange,
    onMinClusterSizeChange,
    disabled = false,
}: ReportFiltersProps) {
    const [localThreshold, setLocalThreshold] = useState(String(Math.round(confidenceThreshold < 1 ? confidenceThreshold * 100 : confidenceThreshold)));
    const [localMinSize, setLocalMinSize] = useState(String(minClusterSize));

    useEffect(() => {
        setLocalThreshold(String(Math.round(confidenceThreshold < 1 ? confidenceThreshold * 100 : confidenceThreshold)));
    }, [confidenceThreshold]);

    useEffect(() => {
        setLocalMinSize(String(minClusterSize));
    }, [minClusterSize]);

    return (
        <div className={cn(
            "grid grid-cols-1 md:grid-cols-3 gap-10",
            disabled && "opacity-40 pointer-events-none grayscale transition-all duration-700"
        )}>
            {/* Time Period */}
            <div className="space-y-4 group">
                <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2.5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] pl-1">
                        <Calendar className="w-3.5 h-3.5 text-[var(--brand)]" />
                        Temporal Window
                    </label>
                    <span className="text-[9px] font-bold text-[var(--brand)] opacity-0 group-hover:opacity-100 transition-opacity uppercase">Configured</span>
                </div>
                <div className="relative">
                    <select
                        value={days}
                        onChange={(e) => onDaysChange(Number(e.target.value))}
                        className="w-full bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-[20px] px-6 py-5 text-sm font-bold text-[var(--text-primary)] appearance-none focus:outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)] transition-all uppercase tracking-widest cursor-pointer"
                    >
                        {TIME_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value} className="bg-[var(--card-bg)] text-[var(--text-primary)] py-4 font-bold">
                                {opt.label}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none group-focus-within:text-[var(--brand)] transition-colors" />
                </div>
            </div>

            {/* Confidence Threshold */}
            <div className="space-y-4 group">
                <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2.5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] pl-1">
                        <Target className="w-3.5 h-3.5 text-[var(--warning)]" />
                        Precision Limit (%)
                    </label>
                    <span className="text-[9px] font-bold text-[var(--warning)] opacity-0 group-hover:opacity-100 transition-opacity uppercase">Dynamic</span>
                </div>
                <div className="relative">
                    <input
                        type="text"
                        inputMode="numeric"
                        value={localThreshold}
                        onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, "");
                            if (val === "") {
                                setLocalThreshold("");
                                return;
                            }
                            const num = parseInt(val);
                            if (!isNaN(num) && num <= 100) {
                                setLocalThreshold(val);
                                onThresholdChange(num / 100);
                            }
                        }}
                        onBlur={() => {
                            if (localThreshold === "") {
                                setLocalThreshold("0");
                                onThresholdChange(0);
                            }
                        }}
                        className="w-full bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-[20px] pl-6 pr-16 py-5 text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--warning)] focus:ring-4 focus:ring-[var(--warning-soft)] transition-all tabular-nums"
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                        <span className="text-[10px] font-bold text-[var(--text-muted)]/40 uppercase">Match</span>
                        <Zap className="w-3.5 h-3.5 text-[var(--warning)] opacity-40" />
                    </div>
                </div>
            </div>

            {/* Min Cluster Size */}
            <div className="space-y-4 group">
                <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2.5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] pl-1">
                        <Layers className="w-3.5 h-3.5 text-[var(--success)]" />
                        Recurrence Min
                    </label>
                    <span className="text-[9px] font-bold text-[var(--success)] opacity-0 group-hover:opacity-100 transition-opacity uppercase">Sensitivity</span>
                </div>
                <div className="relative">
                    <input
                        type="text"
                        inputMode="numeric"
                        value={localMinSize}
                        onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, "");
                            if (val === "") {
                                setLocalMinSize("");
                                return;
                            }
                            const num = parseInt(val);
                            if (!isNaN(num)) {
                                const clamped = Math.min(100, num);
                                setLocalMinSize(String(clamped));
                                if (clamped >= 1) {
                                    onMinClusterSizeChange(clamped);
                                }
                            }
                        }}
                        onBlur={() => {
                            const num = parseInt(localMinSize);
                            if (isNaN(num) || num < 1) {
                                setLocalMinSize("1");
                                onMinClusterSizeChange(1);
                            }
                        }}
                        className="w-full bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-[20px] pl-6 pr-16 py-5 text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--success)] focus:ring-4 focus:ring-[var(--success-soft)] transition-all tabular-nums"
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                        <span className="text-[10px] font-bold text-[var(--text-muted)]/40 uppercase">Hits</span>
                        <Shield className="w-3.5 h-3.5 text-[var(--success)] opacity-40" />
                    </div>
                </div>
            </div>
        </div>
    );
}
