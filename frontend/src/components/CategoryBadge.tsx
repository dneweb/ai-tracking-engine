import { cn } from "@/lib/utils";

interface Props {
    category: string;
}

export default function CategoryBadge({ category }: Props) {
    let color = "var(--text-muted)";
    const normalized = category.toLowerCase();

    if (normalized.includes("hr")) {
        color = "var(--brand)";
    } else if (normalized.includes("security") || normalized.includes("it")) {
        color = "var(--brand)";
    } else if (normalized.includes("engineer")) {
        color = "var(--warning)";
    } else if (normalized.includes("finance")) {
        color = "var(--success)";
    } else if (normalized.includes("operation")) {
        color = "var(--success)";
    }

    return (
        <span 
            className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border shadow-sm transition-all"
            style={{ 
                backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`,
                borderColor: `color-mix(in srgb, ${color} 20%, transparent)`,
                color: color
            }}
        >
            {category}
        </span>
    );
}
