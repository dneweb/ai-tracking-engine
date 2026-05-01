export const ROLE_REDIRECT = {
  "org:owner":  "/dashboard",
  "org:admin":  "/dashboard", 
  "org:member": "/dashboard",
  "org:viewer": "/dashboard/ask",
} as const;

export function getRedirectForRole(role: string): string {
  return ROLE_REDIRECT[role as keyof typeof ROLE_REDIRECT] ?? "/dashboard";
}