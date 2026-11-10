# Step-by-Step Guide: Deploying CARE System (Workplace Solution) on Vercel

This guide walks you through deploying the **CARE System (Corporate Operational Car Booking System)** to **Vercel** securely, connecting a production PostgreSQL database (Neon / Vercel Postgres / Supabase), configuring server-only environment variables, and pushing updates via GitHub.

---

## 1. Security Architecture Checklist (Pre-Deployment)

Before deploying, verify how the application protects sensitive credentials and resists cyber attacks:

1. **Zero Frontend Secrets & Zero Hardcoded Passwords**:
   - No API keys, JWT secrets, initial passwords, or database connection strings use the `NEXT_PUBLIC_` prefix or appear in client code.
   - All secrets (`JWT_SECRET`, `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `INITIAL_*_PASSWORD`, `WHATSAPP_WEBHOOK_SECRET`) are strictly read inside server-only modules (`src/lib/auth.ts`, `src/lib/store.ts`, `src/app/api/*`).
   - In production (`NODE_ENV=production`), `src/lib/auth.ts` enforces that `JWT_SECRET` (minimum 32 characters) is explicitly configured and refuses to sign/verify tokens without it.
2. **Internal Corporate Authentication Only**:
   - External third-party OAuth (such as Google Sign-In) is completely excluded.
   - Every newly registered account starts with status `PENDING_APPROVAL` and cannot log in until a **Workplace Solution Admin** approves it.
   - Deactivated accounts (`DEACTIVATED`) are blocked immediately at the API guard layer (`src/lib/server-guard.ts`), even if an older session cookie exists.
   - Role escalation guards prevent non-Super Admins from assigning `SUPER_ADMIN` or modifying their own role (`src/app/api/users/route.ts`), and trip execution endpoints verify assigned driver ownership (`src/app/api/trips/route.ts`).
3. **Cyber-Resilience & Hardening**:
   - **Database-Backed Brute-Force Rate Limiting**: Sliding-window IP + identifier rate limiting (`src/lib/rate-limit.ts`) persists across serverless invocations in PostgreSQL (`RateLimit` table) and locks out repeated failed login/registration attempts (`HTTP 429`).
   - **CSRF Protection**: `src/middleware.ts` validates `Origin` vs `Host` headers on all state-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`).
   - **HTTP Security Headers**: `next.config.mjs` enforces `Content-Security-Policy` (without `'unsafe-eval'` in production), `Strict-Transport-Security (HSTS)`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Permissions-Policy`.
   - **Input Validation & XSS Sanitization**: Every API payload is validated with `zod` schemas (`src/lib/validations.ts`) and stripped of script/HTML injection tags.

---

## 2. Step-by-Step Deployment to Vercel

### Step 1: Push the Repository to GitHub
In your project terminal (`d:\CARE System`), commit and push to your GitHub repository:
```powershell
git add .
git commit -m "security: harden auth, prisma postgres persistence, and zero vulnerabilities"
git push origin main
```
*(Note: `.env`, `.env.local`, and `.data-store.json` are automatically ignored by `.gitignore` so secrets and local state are never pushed to GitHub.)*

---

### Step 2: Import Project into Vercel
1. Log in to [https://vercel.com/dashboard](https://vercel.com/dashboard).
2. Click **"Add New..."** -> **"Project"**.
3. Select your GitHub repository (`ahmadhafi/CARE-System`) and click **Import**.
4. Confirm the build settings:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `./`
   - **Build Command**: `npm run vercel-build` *(runs `prisma generate && prisma db push --skip-generate && next build`)*
   - **Install Command**: `npm install --legacy-peer-deps`
   - **Output Directory**: `.next`

---

### Step 3: Provision a Production PostgreSQL Database
The application uses a **Dual-Engine Persistence Layer** (`src/lib/store.ts` + `prisma/schema.prisma`):
- When `DATABASE_URL` is configured (on Vercel), all users, bookings, vehicles, car types, trips, GPS telemetry, audit logs, and rate-limit buckets are stored in **PostgreSQL** via Prisma and automatically seeded on first boot.
- When `DATABASE_URL` is omitted (local quick start without Postgres installed), it automatically falls back to a local `.data-store.json` file.

To connect PostgreSQL on Vercel:
1. Inside your Vercel Project dashboard, go to the **Storage** tab.
2. Click **Create Database** -> select **Neon Postgres** (or **Supabase** / **Vercel Postgres**).
3. Connect it to your project — Vercel will automatically inject `DATABASE_URL` and `DATABASE_URL_UNPOOLED` into your environment variables.

---

### Step 4: Configure Server-Only Environment Variables in Vercel
In the Vercel project settings (**Settings** -> **Environment Variables**), add the following variables for **Production**, **Preview**, and **Development**:

| Variable Name | Value / How to Generate | Scope |
| :--- | :--- | :--- |
| `JWT_SECRET` | **Required in Production.** Generate a 64-character random hex string using:<br>`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` | Server-Only |
| `DATABASE_URL` | Pooled PostgreSQL connection URL (auto-populated by Vercel Postgres / Neon) | Server-Only |
| `DATABASE_URL_UNPOOLED` | Direct PostgreSQL connection URL for schema push / migrations | Server-Only |
| `INITIAL_ADMIN_PASSWORD` | Strong initial password for the default Workplace Solution Admin (`WS-001`) | Server-Only |
| `INITIAL_SUPER_ADMIN_PASSWORD` | Strong initial password for the default IT Super Admin (`IT-001`) | Server-Only |
| `INITIAL_EMPLOYEE_PASSWORD` | Strong initial password for the seeded Employee accounts (`EMP-101`, `EMP-102`, `EMP-103`) | Server-Only |
| `INITIAL_DRIVER_PASSWORD` | Strong initial password for the seeded Driver accounts (`DRV-201`, `DRV-202`, `DRV-203`) | Server-Only |
| `SESSION_TIMEOUT_MINUTES` | `30` (Enforces PRD NFR-004 30-minute idle session timeout) | Server-Only |
| `WHATSAPP_WEBHOOK_SECRET` | Strong random secret for verifying inbound WhatsApp Business API webhooks | Server-Only |

> [!CAUTION]
> **Never** prefix any secret variable with `NEXT_PUBLIC_`. Variables prefixed with `NEXT_PUBLIC_` are bundled into browser JavaScript.

---

### Step 5: Deploy & Sign In
1. Click **Deploy** in Vercel.
2. During the first deployment, `npm run vercel-build` will push the Prisma schema (`prisma/schema.prisma`) to your PostgreSQL database, and the first request will seed the initial fleet (3 Hyundai Ioniq 5 EV + 5 Hyundai Stargazer Petrol) and initial accounts using the passwords you set in `INITIAL_*_PASSWORD`:
   - **Workplace Solution Admin**: `WS-001` (Password from `INITIAL_ADMIN_PASSWORD`)
   - **Super Admin**: `IT-001` (Password from `INITIAL_SUPER_ADMIN_PASSWORD`)
   - **Employee (Gojek UI)**: `EMP-101` (Password from `INITIAL_EMPLOYEE_PASSWORD`)
   - **Driver (GPS & Odo)**: `DRV-201` (Password from `INITIAL_DRIVER_PASSWORD`)
   - **Pending User (Blocked until WS Admin approves)**: `EMP-103`
3. For local development (`npm run dev`), either set `INITIAL_ADMIN_PASSWORD` in `.env.local` or check your terminal console where a one-time random session password is generated and logged if no env password is set.
