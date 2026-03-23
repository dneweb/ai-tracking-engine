"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";
import UserSync from "./UserSync";
import { ToastProvider } from "@/context/ToastContext";
import ToastContainer from "./Toast";

const AUTH_ROUTES = ["/login", "/sign-in", "/sign-up"];

export default function LayoutShell({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname() || "";
    const isAuthRoute = AUTH_ROUTES.some(route => pathname === route || pathname.startsWith(route + "/"));

    if (isAuthRoute) {
        return <>{children}</>;
    }

    return (
        <ToastProvider>
            <UserSync />
            <div className="flex bg-background overflow-hidden h-screen">
                <Sidebar />
                <div className="flex-1 ml-[280px] flex flex-col min-h-screen">
                    <Header />
                    <main className="flex-1 px-10 py-6 w-full max-w-5xl mx-auto overflow-y-auto scrollbar-hide">
                        {children}
                    </main>
                </div>
            </div>
            <ToastContainer />
        </ToastProvider>
    );
}
