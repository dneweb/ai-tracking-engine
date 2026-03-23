"use client";

export default function TopicClusterSkeleton() {
    return (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden animate-pulse">
            <div className="p-5 flex items-center justify-between">
                <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="h-5 w-48 bg-gray-800 rounded-lg"></div>
                        <div className="h-4 w-16 bg-gray-800 rounded-full"></div>
                    </div>
                    <div className="h-4 w-32 bg-gray-800 rounded-lg"></div>
                    <div className="flex items-center gap-3">
                        <div className="h-3 w-20 bg-gray-800 rounded-lg"></div>
                        <div className="flex-1 h-3 bg-gray-800/50 rounded-full max-w-[200px]"></div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="h-8 w-24 bg-gray-800 rounded-lg"></div>
                    <div className="h-8 w-8 bg-gray-800 rounded-lg"></div>
                </div>
            </div>
        </div>
    );
}
