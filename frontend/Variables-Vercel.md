## Vercel Environment Variables (Frontend)

These variables are configured in Vercel → Project → Settings → Environment Variables. Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser and baked at build time.

Required (Build-time)
- NEXT_PUBLIC_BACKEND_URL
  - What: Base URL of the Railway backend API (no trailing slash)
  - Example: https://multi-electric-api.up.railway.app

Optional (Build-time)
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  - What: Stripe publishable key used on the client
  - Use your Stripe Dashboard value (do not paste example keys here)

Optional (Dev-only)
- ALLOWED_DEV_ORIGINS
  - What: Comma-separated list of origins allowed by Next.js dev server (local/LAN). Not used on Vercel builds.
  - Example: http://192.168.1.50:3000,http://127.0.0.1:3000

Notes
- Build-time vs runtime: Next.js in Vercel embeds these values at build time. Changing them later requires a rebuild/redeploy.
- Security: Only `NEXT_PUBLIC_*` variables are exposed to the browser. Do not put secrets here.
- CORS/Cookies: Ensure the backend is configured to allow requests from your Vercel domain with credentials; see Variables-Railway.md.

