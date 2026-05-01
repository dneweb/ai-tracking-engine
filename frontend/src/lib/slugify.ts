/**
 * Converts any string into a URL-safe org slug.
 * Mirrors the to_slug() function in backend/app/routers/auth_flow.py exactly.
 */
export function toSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
