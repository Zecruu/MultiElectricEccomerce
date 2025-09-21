Multi Electric Supply — E-commerce Foundation

Stack
- Frontend: Next.js (App Router, TypeScript, TailwindCSS)
- Backend: Node.js + Express (TypeScript), REST APIs
- Database: MongoDB Atlas (Mongoose)
- Auth: JWT access/refresh in httpOnly cookies, bcrypt, CSRF protection

Local development
1) Backend
- Copy backend/.env.example to backend/.env and fill values.
- Run:
  - cd backend
  - npm run dev

2) Frontend
- Copy frontend/.env.local.example to frontend/.env.local and adjust NEXT_PUBLIC_BACKEND_URL
- Run:
  - cd frontend
  - npm run dev

Environment variables (backend)
- MONGO_URI: your MongoDB connection string
- JWT_ACCESS_SECRET: long random secret
- JWT_REFRESH_SECRET: different long random secret
- FRONTEND_ORIGIN: http://localhost:3000 (dev) or your front-end domain (prod)
- COOKIE_DOMAIN: localhost (dev) or .multielectricsupply.com (prod)
- EMAIL_HOST/EMAIL_PORT/EMAIL_USER/EMAIL_PASS: SMTP for email verification and reset
- APP_BASE_URL/BACKEND_BASE_URL: optional UX links
- GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET: from Google Cloud Console

Google OAuth setup (summary)
- Google Cloud Console → Create Project → OAuth consent screen (External) → Publish
- Credentials → Create Credentials → OAuth Client ID → Web application
- Authorized JavaScript origins:
  - Dev: http://localhost:3000 and your backend dev URL
  - Prod: https://your-frontend-domain and your backend prod URL
- Authorized redirect URIs:
  - Dev: http://localhost:5000/api/auth/google/callback
  - Prod: https://your-backend-domain/api/auth/google/callback
- Put Client ID/Secret into backend .env

RBAC rules
- Default new user role: customer
- /employee portal requires employee or admin
- Users & Inventory routes require admin only
- API returns 401 when unauthenticated; 403 when authenticated but not allowed

Security
- httpOnly cookies; secure in prod; sameSite=lax
- CSRF protection for state-changing routes
- Rate limiting on auth routes; helmet; CORS locked to frontend origin
- Never store or display plaintext passwords

API endpoints (partial, see code)
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/login-employee
- POST /api/auth/refresh
- POST /api/auth/logout
- GET /api/me
- GET /api/clients (employee/admin)
- POST /api/clients/:id/send-reset (employee/admin)
- DELETE /api/clients/:id (admin)
- GET /api/users (admin)
- POST /api/users (admin)
- PATCH /api/users/:id/role (admin)
- GET /api/inventory (admin)

Notes
- Email verification, password reset, and Google Sign-In are scaffolded and TODO to complete in the next step.
- All mutations should log to AuditLog.

