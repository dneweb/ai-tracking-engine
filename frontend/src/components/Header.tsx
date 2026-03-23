"use client";

import { Bell, Search, Command } from "lucide-react";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";

export default function Header() {
    const pathname = usePathname();
    const { user, isLoaded } = useUser();

    const getPageTitle = (path: string) => {
        if (path === "/" || path === "/ask-question") return { title: "Ask Question", subtitle: "Query our AI on company intelligence" };
        if (path === "/history") return { title: "Nexus History", subtitle: "Archive of deep-intelligence queries" };
        if (path === "/documents") return { title: "Knowledge Base", subtitle: "Manage core company intelligence sources" };
        if (path === "/analytics") return { title: "Intelligence Insights", subtitle: "Performance metrics and gap analysis" };
        if (path === "/reports") return { title: "Deep Reports", subtitle: "Automated analysis of knowledge efficiency" };
        return { title: "Nexus Dashboard", subtitle: "System Overview" };
    };

    const { title, subtitle } = getPageTitle(pathname);

    return (
        <header className="h-20 px-10 sticky top-4 z-40 mx-6 rounded-2xl glass mb-4 flex items-center justify-center">
            <div className="max-w-5xl w-full flex items-center justify-between">
                <div className="flex flex-col">
                    <h1 className="text-xl font-bold text-foreground tracking-tight">{title}</h1>
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-[0.15em] opacity-80">{subtitle}</p>
                </div>

                <div className="flex items-center gap-6">
                    {/* Search Bar - Aesthetic Only */}
                    <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-white/[0.03] border border-white/[0.05] rounded-xl text-muted-foreground group hover:border-white/10 transition-colors cursor-text">
                        <Search className="w-4 h-4 group-hover:text-foreground transition-colors" />
                        <span className="text-xs font-medium pr-8">Search system...</span>
                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-white/[0.05] border border-white/[0.1] rounded text-[10px] font-bold">
                            <Command className="w-2.5 h-2.5" />
                            <span>K</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-white/[0.05] rounded-xl transition-all relative group">
                            <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full border-2 border-[#161618] shadow-[0_0_8px_rgba(139,92,246,0.5)]"></span>
                        </button>
                        
                        {isLoaded && user && (
                            <div className="flex items-center gap-3 pl-3 border-l border-white/[0.05]">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold text-xs border border-primary/20 overflow-hidden shadow-inner">
                                    <span>
                                        {(user.fullName || user.primaryEmailAddress?.emailAddress || "U").charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
