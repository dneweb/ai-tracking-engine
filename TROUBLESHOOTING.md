# Troubleshooting Guide: Auth & API

This guide documents the common issues resolved in the latest update and how to diagnose new ones.

## Problem 1: Sign-In Flow Errors
**Symptoms:** "Sign in failed. Please try again." or "Multi-factor authentication required" errors during normal sign-in.
**Cause:** State reuse conflict. When a user clicks "Forgot password?", it creates a Clerk sign-in with strategy `reset_password_email_code`. Returning to normal sign-in tried to use the `password` strategy on that existing reset session.
**Fix:** The code now checks if the existing session supports the `password` strategy before reusing it. If not (e.g., it's a reset session), it creates a fresh sign-in.

## Problem 2: API Calls Returning 404
**Symptoms:** Requests to `https://vercel-app.com/backend-api/...` return 404.
**Cause:** Vercel doesn't have a `/backend-api` route by default. Requests were being handled by the frontend instead of being sent to the backend.
**Fix:**
1. **Next.js Rewrites:** `next.config.ts` now proxies `/backend-api` to the Render backend URL.
2. **Intelligent API Client:** `api-client.ts` now uses the proxy path in production to avoid CORS and 404 issues.

## Diagnostic Checklist
1. **Check Console Logs:**
   - Look for `[System] Initialized API Client with BASE: .../backend-api`.
   - Check if requests go to `/backend-api/...` and not directly to the Render URL (which causes CORS).
2. **Verify Environment Variables:**
   - Ensure `NEXT_PUBLIC_API_BASE_URL` is set to the correct Render URL in Vercel.
3. **Clear Cache:**
   - If issues persist, redeploy on Vercel with **"Use existing Build Cache" UNCHECKED**.
