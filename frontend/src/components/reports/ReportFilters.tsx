"use client";

import { useState, useEffect } from "react";
import { SlidersHorizontal } from "lucide-react";

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
    { value: 7, label: "Last 7 days" },
    { value: 14, label: "Last 14 days" },
    { value: 30, label: "Last 30 days" },
    { value: 90, label: "Last 90 days" },
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
    // We use local state for string values to allow backspacing/clearing during typing
    const [localThreshold, setLocalThreshold] = useState(String(Math.round(confidenceThreshold * 100)));
    const [localMinSize, setLocalMinSize] = useState(String(minClusterSize));

    // Sync local state when external props change (e.g. from a reset)
    useEffect(() => {
        setLocalThreshold(String(Math.round(confidenceThreshold * 100)));
    }, [confidenceThreshold]);

    useEffect(() => {
        setLocalMinSize(String(minClusterSize));
    }, [minClusterSize]);

    return (
        <div className={`bg-card border border-border rounded-xl p-5 transition-opacity ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
            <div className="flex items-center gap-2 mb-4">
                <SlidersHorizontal className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-300">Report Filters</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {/* Time Period */}
                <div>
                    <label className="block text-xs text-gray-500 mb-1.5">
                        Analyze questions from
                    </label>
                    <select
                        value={days}
                        onChange={(e) => onDaysChange(Number(e.target.value))}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    >
                        {TIME_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Confidence Threshold */}
                <div>
                    <label className="block text-xs text-gray-500 mb-1.5">
                        Show questions with confidence below (%)
                    </label>
                    <div className="relative group">
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
                            className="w-full bg-background border border-border rounded-lg pl-3 pr-8 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all group-hover:border-white/10"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs pointer-events-none">
                            %
                        </span>
                    </div>
                </div>

                {/* Min Cluster Size */}
                <div>
                    <label className="block text-xs text-gray-500 mb-1.5">
                        Minimum questions per topic
                    </label>
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
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all hover:border-white/10"
                    />
                </div>
            </div>
        </div>
    );
}
