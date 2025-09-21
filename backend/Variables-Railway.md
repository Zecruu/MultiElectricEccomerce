## Railway Environment Variables (Backend)

Set these in Railway → Variables. All are runtime (no rebuild required after changes, only restart/redeploy).

Required
- NODE_ENV
  - production
- PORT
  - Use Railway provided port if available; otherwise 5000
- MONGO_URI
  - MongoDB connection string
- JWT_ACCESS_SECRET
  - Long random string
- JWT_REFRESH_SECRET
  - Long random string (different from access)
- FRONTEND_ORIGIN
  - Exact origin of your frontend (Vercel or custom domain)
  - Example: https://multi-electric.vercel.app

Recommended / CORS & Cookies
- CORS_ADDITIONAL_ORIGINS (optional)
  - Comma-separated allow-list for additional origins (e.g., staging, custom domain)
- CORS_ALLOW_VERCEL_WILDCARD (optional; default behavior is enabled)
  - Set to `1` to allow all https://*.vercel.app (preview deployments)
- COOKIE_DOMAIN (optional)
  - Parent domain for cookies when using custom domains (e.g., .multielectric.com)
- COOKIE_SAMESITE (optional)
  - One of `lax`, `none`, `strict`. Defaults to `none` in production

URLs for links
- APP_BASE_URL (optional)
  - Frontend URL used for email deep links (password reset, etc.)
- BACKEND_BASE_URL (optional)
  - Backend public URL used in server-generated links and OAuth redirects

Email (optional)
- EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS

Google OAuth (optional)
- GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

AWS S3 (uploads)
- AWS_REGION
- S3_BUCKET

Stripe
- STRIPE_SECRET_KEY (required for payments when enabled)
  - Keep your TEST secret active initially post-deploy for debugging
  - Do not commit or paste the actual key here. Use Railway Variables UI only.
- STRIPE_WEBHOOK_SECRET (required when using webhooks)
  - Supports comma-separated secrets to handle both test and live simultaneously
  - Do not commit or paste actual secrets in docs; set them only in Railway Variables.

Notes
- CORS preview deploys: If you rely on Vercel preview URLs, set `CORS_ALLOW_VERCEL_WILDCARD=1` or add each preview URL to `CORS_ADDITIONAL_ORIGINS`.
- Cookies across domains: In production we set `SameSite=None; Secure` automatically; set `COOKIE_DOMAIN` only when using a shared custom parent domain.
- Webhooks: Stripe endpoint is available at `/api/webhooks/stripe` and requires raw body and a valid `STRIPE_WEBHOOK_SECRET`.

