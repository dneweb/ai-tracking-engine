# Vercel Configuration Guide

Configure these environment variables in your Vercel dashboard to ensure the backend proxy and Clerk authentication work correctly.

## Environment Variables
Go to: **Vercel Dashboard** → **Settings** → **Environment Variables**

Add the following for **ALL** environments (Production, Preview, Development):

| Variable | Value |
| :--- | :--- |
| `NEXT_PUBLIC_API_BASE_URL` | `https://ai-tracking-engine.onrender.com` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_bW92ZWQtZHJhZ29uLTE5LmNsZXJrLmFjY291bnRzLmRldiQ` |
| `CLERK_SECRET_KEY` | `[Your Clerk Secret Key]` |

## Why this is needed
- `NEXT_PUBLIC_API_BASE_URL`: Used by Next.js rewrites to proxy requests to Render.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Required for Clerk frontend authentication.
- `CLERK_SECRET_KEY`: Required for Clerk backend validation.
