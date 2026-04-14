import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that do NOT require authentication
const PUBLIC_ROUTES = ["/login"];

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow public routes through
    if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
        return NextResponse.next();
    }

    // CHECKPOINT: Legacy cookie auth check disabled to allow Clerk middleware to handle auth
    // const user = request.cookies.get("ai_tracking_user");

    // if (!user) {
    //     const loginUrl = new URL("/login", request.url);
    //     loginUrl.searchParams.set("from", pathname);
    //     return NextResponse.redirect(loginUrl);
    // }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths EXCEPT:
         * - _next/static (static files)
         * - _next/image  (image optimisation)
         * - favicon.ico, public assets
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico)$).*)",
    ],
};
