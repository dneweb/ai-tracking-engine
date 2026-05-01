"use client";

export default function TopicClusterSkeleton() {
    return (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl overflow-hidden animate-pulse">
            <div className="p-5 flex items-center justify-between">
                <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="h-5 w-48 bg-[var(--bg-primary)] rounded-lg"></div>
                        <div className="h-4 w-16 bg-[var(--bg-primary)] rounded-full"></div>
                    </div>
                    <div className="h-4 w-32 bg-[var(--bg-primary)] rounded-lg"></div>
                    <div className="flex items-center gap-3">
                        <div className="h-3 w-20 bg-[var(--bg-primary)] rounded-lg"></div>
                        <div className="flex-1 h-3 bg-[var(--bg-primary)]/50 rounded-full max-w-[clamp(10.0rem,20.0vw,12.5rem)]"></div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="h-8 w-24 bg-[var(--bg-primary)] rounded-lg"></div>
                    <div className="h-8 w-8 bg-[var(--bg-primary)] rounded-lg"></div>
                </div>
            </div>
        </div>
    );
}
