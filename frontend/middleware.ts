import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/pending(.*)",
  // Legacy Clerk catch-all routes (kept for compatibility)
  "/(auth)(.*)",
]);

const isDashboardRoute = createRouteMatcher(["/dashboard(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  // Signed-in users should not see auth pages — push to dashboard
  // Exception: /sign-up and /sign-in need to remain accessible during their
  // multi-step flows (Clerk sets the session active mid-flow, before org setup completes)
  if (userId && isPublicRoute(req)) {
    const url = req.nextUrl.pathname;
    const isOnSignup = url.startsWith("/sign-up");
    const isOnSignin = url.startsWith("/sign-in");
    if (!isOnSignup && !isOnSignin) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  // Unauthenticated users cannot access dashboard
  if (!userId && isDashboardRoute(req)) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
