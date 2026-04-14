import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/landing(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/backend-api(.*)",
]);

const isAdminRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/reports(.*)",
  "/documents(.*)",
  "/analytics(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();

  // Redirect signed-in users away from the landing page back to the dashboard
  if (userId && req.nextUrl.pathname.startsWith("/landing")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // If unauthenticated and trying to hit the dashboard root, redirect to landing
  if (!userId && req.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/landing", req.url));
  }

  // Not logged in — redirect to sign in
  if (!userId && !isPublicRoute(req)) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  // Logged in — check admin routes
  if (userId && isAdminRoute(req)) {
    const role = (sessionClaims?.metadata as { role?: string })?.role;
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!.*\\..*|_next).*)",
    "/",
    "/(api|trpc)(.*)"
  ],
};
