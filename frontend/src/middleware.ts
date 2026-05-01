import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/landing(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/pending(.*)",
]);

const isDashboardRoute = createRouteMatcher(["/dashboard(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  // Signed-in users should not see auth pages — push to home
  if (userId && isPublicRoute(req)) {
    const url = req.nextUrl.pathname;
    const isOnSignup = url.startsWith("/sign-up");
    const isOnSignin = url.startsWith("/sign-in");
    const isLanding = url.startsWith("/landing");
    const isRoot = url === "/";

    if (!isOnSignup && !isOnSignin && (isLanding || isRoot)) {
      // If we are logged in and on landing or root, we are fine, 
      // but let's ensure we stay on the root/ask-question page.
      return NextResponse.next();
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
