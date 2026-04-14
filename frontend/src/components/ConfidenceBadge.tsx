import { cn } from "@/lib/utils";
import { normalizeConfidencePercent } from "@/lib/api";

interface Props {
    confidence: number;
}

export default function ConfidenceBadge({ confidence }: Props) {
    const pct = normalizeConfidencePercent(confidence);
    
    let color = "var(--danger)";
    if (pct >= 80) {
        color = "var(--success)";
    } else if (pct >= 60) {
        color = "var(--warning)";
    }

    return (
        <div 
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border shadow-sm transition-all"
            style={{ 
                backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`,
                borderColor: `color-mix(in srgb, ${color} 20%, transparent)`,
                color: color
            }}
        >
            <div 
                className="w-1 h-1 rounded-full animate-pulse" 
                style={{ backgroundColor: color }}
            />
            {Math.round(pct)}% Confidence
        </div>
    );
}
