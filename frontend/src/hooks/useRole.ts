/**
 * useRole — single source of truth for the current user's role.
 *
 * Role hierarchy (highest → lowest):
 *   owner  → full control
 *   admin  → manage members & content
 *   member → submit queries, read documents
 *   viewer → read-only access
 *
 * publicMetadata is set by the backend (register-owner / approve-request).
 * The token is refreshed by calling user.reload() after backend registration.
 */
import { useUser } from "@clerk/nextjs";

export type AppRole = "owner" | "admin" | "member" | "viewer";

/** Canonical power levels — mirrors backend ROLE_POWER */
const ROLE_POWER: Record<AppRole, number> = {
  owner:  4,
  admin:  3,
  member: 2,
  viewer: 1,
};

/** Human-readable display label for each role */
export const ROLE_LABEL: Record<AppRole, string> = {
  owner:  "Owner",
  admin:  "Administrator",
  member: "Member",
  viewer: "Viewer",
};

export function useRole() {
  const { user, isLoaded, isSignedIn } = useUser();

  // Read from Clerk publicMetadata (set by backend after registration)
  const rawRole = user?.publicMetadata?.role as string | undefined;

  // Normalise to a known AppRole — default to "viewer" if unrecognised
  const role = ((): AppRole => {
    if (!rawRole) return "viewer";
    const r = rawRole.replace("org:", "").toLowerCase();
    if (r === "owner" || r === "admin" || r === "member" || r === "viewer") {
      return r as AppRole;
    }
    return "viewer";
  })();

  const power = ROLE_POWER[role];

  return {
    role,

    // Convenience booleans
    isOwner:  role === "owner",
    isAdmin:  role === "owner" || role === "admin",   // ← owners are also admins
    isMember: power >= ROLE_POWER["member"],
    isViewer: true,                                   // all authenticated users can view

    // Can perform write operations
    canWrite: power >= ROLE_POWER["admin"],

    // Display
    roleLabel: ROLE_LABEL[role],

    // Clerk state
    isLoaded,
    isSignedIn,
  };
}
