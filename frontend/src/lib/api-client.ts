/**
 * Typed API client for KnowledgeEngine backend.
 *
 * Features:
 *  - Dev-mode logging for every request + response
 *  - Human-readable error messages for common HTTP status codes
 *  - Optional bearer token injection
 *  - Typed return: { data, error, status } — never throws
 */

// intelligent URL construction: use the /backend-api proxy path
// In browser: /backend-api/:path* → proxied by Next.js → Render /api/:path*
// On server (SSR): direct to Render with /api prefix as fallback
const API_BASE = typeof window !== "undefined"
  ? `${window.location.origin}/backend-api`
  : (process.env.NEXT_PUBLIC_API_URL ?? "https://ai-tracking-engine.onrender.com/api").replace(/\/$/, "");

// Explicitly log the API URL being used to the console on load (helps debugging production)
if (typeof window !== "undefined") {
  console.log(`[System] Initialized API Client with BASE: ${API_BASE}`);
}

export interface ApiResult<T> {
  data: T | null;
  error: string | null;
  status: number;
}

export async function apiCall<T>(
  path: string,
  options?: RequestInit,
  token?: string
): Promise<ApiResult<T>> {
  const url = `${API_BASE}${path}`;
  const method = options?.method ?? "GET";

  if (process.env.NODE_ENV === "development") {
    console.log(`[API] ${method} ${url}`);
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options?.headers ?? {}),
      },
    });

    // Attempt to parse JSON gracefully
    let body: Record<string, unknown> = {};
    try {
      body = await res.json();
    } catch {
      // Non-JSON body — leave body as {}
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`[API] ${res.status}`, body);
    }

    if (!res.ok) {
      // detail can be a string or object (FastAPI raises HTTPException with dict detail)
      const detail = body?.detail as Record<string, string> | string | undefined;
      const message =
        typeof detail === "object" && detail !== null
          ? (detail.message ?? JSON.stringify(detail))
          : typeof detail === "string"
          ? detail
          : res.status === 404
          ? "Not found."
          : res.status === 409
          ? "Already exists."
          : res.status === 429
          ? "Too many attempts. Wait a moment."
          : res.status === 403
          ? (body?.message as string | undefined) ?? "Access denied."
          : "Something went wrong.";

      return { data: null, error: message as string, status: res.status };
    }

    return { data: body as T, error: null, status: res.status };
  } catch {
    return {
      data: null,
      error: "Cannot reach server. Is the backend running?",
      status: 0,
    };
  }
}
