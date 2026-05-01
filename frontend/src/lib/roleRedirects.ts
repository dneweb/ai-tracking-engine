/**
 * Role → default redirect map.
 * Mirrors ROLE_REDIRECT in auth_flow.py exactly.
 *
 * Role hierarchy (highest → lowest):
 *   owner  → full dashboard
 *   admin  → full dashboard
 *   member → ask/query page
 *   viewer → view-only dashboard
 */
export const ROLE_REDIRECT: Record<string, string> = {
  owner:  "/dashboard",
  admin:  "/dashboard",
  member: "/dashboard/ask",
  viewer: "/dashboard",        // read-only: can see docs & analytics but not query
};

export function getRedirectForRole(role: string): string {
  return ROLE_REDIRECT[role] ?? "/dashboard";
}
