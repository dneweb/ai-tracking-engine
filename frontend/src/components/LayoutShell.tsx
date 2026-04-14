"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";
import UserSync from "./UserSync";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

const AUTH_ROUTES = ["/login", "/sign-in", "/sign-up", "/landing"];

export default function LayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "";
  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  // Mobile sidebar open/close state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const openMobileSidebar  = useCallback(() => setMobileSidebarOpen(true),  []);
  const closeMobileSidebar = useCallback(() => setMobileSidebarOpen(false), []);

  useEffect(() => {
    closeMobileSidebar();
  }, [pathname, closeMobileSidebar]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMobileSidebar();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeMobileSidebar]);

  const { isLoaded, userId } = useAuth();

  if (isAuthRoute) {
    return <>{children}</>;
  }

  // While Clerk is initialising OR user is not authenticated:
  // render ONLY children (no sidebar / header).
  // AskQuestionClient will show its own spinner and handle the redirect.
  // This is the precise fix that stops the sidebar + header flashing
  // for unauthenticated users.
  if (!isLoaded || !userId) {
    return <>{children}</>;
  }

  return (
    <>
      <UserSync />
      {/* Full-page mesh canvas */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 15% 10%, color-mix(in srgb, var(--brand) 10%, transparent) 0, transparent 55%), radial-gradient(ellipse at 90% 90%, color-mix(in srgb, var(--brand) 6%, transparent) 0, transparent 50%)",
        }}
      />

      <div id="app-root" className="app-shell">
        {/* Sidebar — desktop always visible, mobile via css toggle */}
        <Sidebar
          mobileOpen={mobileSidebarOpen}
          onMobileClose={closeMobileSidebar}
        />

        {/* Mobile sidebar overlay */}
        <div 
          className={cn("sidebar-overlay", mobileSidebarOpen && "visible")} 
          onClick={closeMobileSidebar} 
        />

        {/* Main content — wraps header and scrollable area */}
        <div className="main-wrapper">
          <Header onMobileMenuClick={openMobileSidebar} />
          <main className="main-content relative overflow-x-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={pathname}
                initial={{ opacity: 0, scale: 0.985, filter: "blur(12px)", y: 12 }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)", y: 0 }}
                exit={{ opacity: 0, scale: 1.01, filter: "blur(12px)", y: -12 }}
                transition={{ 
                  duration: 0.8, 
                  ease: [0.19, 1, 0.22, 1], // Cinematic Expo Out
                  opacity: { duration: 0.4 },
                  filter: { duration: 0.5 }
                }}
                className="w-full min-h-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </>
  );
}
