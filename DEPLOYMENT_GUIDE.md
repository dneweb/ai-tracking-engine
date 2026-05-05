# Deployment Guide: AI Tracking Engine

Follow these steps to deploy the fixed authentication and API proxy configuration.

## Step 1: Update Code
Ensure all files are updated in your repository:
- `app/sign-in/page.tsx` (Sign-in flow fixes)
- `next.config.ts` (API Proxy configuration)
- `lib/api-client.ts` (Intelligent URL construction)

```bash
git add .
git commit -m "Fix sign-in flow and API proxy"
git push origin main
```

## Step 2: Configure Vercel
Go to your Vercel Dashboard and follow the [VERCEL_SETUP.md](./VERCEL_SETUP.md) guide to configure environment variables.

## Step 3: Redeploy
1. Go to **Vercel Dashboard** → **Deployments**.
2. Click the `...` menu on the latest deployment.
3. Click **Redeploy**.
4. **CRITICAL**: Uncheck "Use existing Build Cache" to ensure the new proxy config is applied.
5. Click **Redeploy**.

## Step 4: Verify
Open your deployed app and check the console:
- ✅ `[System] Initialized API Client with BASE: .../backend-api`
- ✅ `POST /backend-api/...` returns `200` (not `404`)
- ✅ Sign-in works even after "Forgot password" attempts.
