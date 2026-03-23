import { cn } from "@/lib/utils";

interface Props {
    category: string;
}

export default function CategoryBadge({ category }: Props) {
    let colorClass = "bg-white/[0.05] text-muted-foreground border-white/[0.05]";

    const normalized = category.toLowerCase();

    if (normalized.includes("hr")) {
        colorClass = "bg-purple-500/10 text-purple-400 border-purple-500/20";
    } else if (normalized.includes("security") || normalized.includes("it")) {
        colorClass = "bg-blue-500/10 text-blue-400 border-blue-500/20";
    } else if (normalized.includes("engineer")) {
        colorClass = "bg-orange-500/10 text-orange-400 border-orange-500/20";
    } else if (normalized.includes("finance")) {
        colorClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    } else if (normalized.includes("operation")) {
        colorClass = "bg-teal-500/10 text-teal-400 border-teal-500/20";
    }

    return (
        <span className={cn("px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border shadow-sm", colorClass)}>
            {category}
        </span>
    );
}
