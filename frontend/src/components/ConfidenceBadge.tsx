import { cn } from "@/lib/utils";
import { normalizeConfidencePercent } from "@/lib/api";

interface Props {
    confidence: number;
}

export default function ConfidenceBadge({ confidence }: Props) {
    const pct = normalizeConfidencePercent(confidence);
    
    let colorClass = "bg-danger/10 text-danger border-danger/20";
    if (pct >= 80) {
        colorClass = "bg-success/10 text-success border-success/20";
    } else if (pct >= 60) {
        colorClass = "bg-warning/10 text-warning border-warning/20";
    }

    return (
        <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border shadow-sm", colorClass)}>
            <div className={cn("w-1 h-1 rounded-full animate-pulse", 
                pct >= 80 ? "bg-success" : pct >= 60 ? "bg-warning" : "bg-danger"
            )} />
            {Math.round(pct)}% Confidence
        </div>
    );
}
