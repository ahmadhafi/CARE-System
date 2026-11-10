# Step-by-Step Guide: Deploying CARE System (Workplace Solution) on Vercel

This guide walks you through deploying the **CARE System (Corporate Operational Car Booking System)** to **Vercel** securely, configuring server-only environment variables, connecting a production PostgreSQL database, and pushing updates via GitHub.

---

## 1. Security Architecture Checklist (Pre-Deployment)

Before deploying, verify how the application protects sensitive credentials and resists cyber attacks:

1. **Zero Frontend Secrets**:
   - No API keys, JWT secrets, or database connection strings use the `NEXT_PUBLIC_` prefix.
   - All secrets (`JWT_SECRET`, `DATABASE_URL`, `WHATSAPP_WEBHOOK_SECRET`) are strictly read inside server-only modules (`src/lib/auth.ts`, `src/app/api/*`).
2. **Internal Corporate Authentication Only**:
   - External third-party OAuth (such as Google Sign-In) is completely excluded.
   - Every newly registered account starts with status `PENDING_APPROVAL` and cannot log in until a **Workplace Solution Admin** approves it.
   - Deactivated accounts (`DEACTIVATED`) are blocked immediately at the API guard layer (`src/lib/server-guard.ts`), even if an older session cookie exists.
3. **Cyber-Resilience & Hardening**:
   - **Brute-Force Rate Limiting**: Sliding-window IP + identifier rate limiting (`src/lib/rate-limit.ts`) locks out repeated failed login/registration attempts (`HTTP 429`).
   - **CSRF Protection**: `src/middleware.ts` validates `Origin` vs `Host` headers on all state-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`).
   - **HTTP Security Headers**: `next.config.mjs` enforces `Content-Security-Policy`, `Strict-Transport-Security (HSTS)`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Permissions-Policy`.
   - **Input Validation & XSS Sanitization**: Every API payload is validated with `zod` schemas (`src/lib/validations.ts`) and stripped of script/HTML injection tags.

---

## 2. Step-by-Step Deployment to Vercel

### Step 1: Push the Repository to GitHub
1. Create a new **Private Repository** on GitHub (e.g., `https://github.com/your-org/care-workplace-solution.git`).
2. In your project terminal (`d:\CARE System`), run:
   ```powershell
   git init
   git add .
   git commit -m "feat: initial release of CARE System for Workplace Solution"
   git branch -M main
   git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO>.git
   git push -u origin main
   ```
   *(Note: `.env` and `.env.local` are automatically ignored by `.gitignore` so secrets are never pushed to GitHub.)*

---

### Step 2: Import Project into Vercel
1. Log in to [https://vercel.com/dashboard](https://vercel.com/dashboard).
2. Click **"Add New..."** -> **"Project"**.
3. Select your GitHub repository (`care-workplace-solution`) and click **Import**.
4. Confirm the framework preset is detected as **Next.js**:
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

---

### Step 3: Provision a Production Database (Optional / Recommended)
The application includes a self-healing store (`src/lib/store.ts`) that works immediately on Vercel for demos/testing, plus a full Prisma PostgreSQL schema (`prisma/schema.prisma`) for persistent production storage:
1. Inside your Vercel Project dashboard, go to the **Storage** tab.
2. Click **Create Database** -> select **Neon Postgres** (or **Supabase** / **Vercel Postgres**).
3. Vercel will automatically inject `DATABASE_URL` into your project's server environment variables.
4. To push the schema to your PostgreSQL database, run locally or in your build step:
   ```powershell
   npx prisma db push
   ```

---

### Step 4: Configure Server-Only Environment Variables in Vercel
In the Vercel project settings (**Settings** -> **Environment Variables**), add the following variables for **Production**, **Preview**, and **Development**:

| Variable Name | Value / How to Generate | Scope |
| :--- | :--- | :--- |
| `JWT_SECRET` | Generate a 64-character random hex string using:<br>`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` | Server-Only (Never expose to client) |
| `SESSION_TIMEOUT_MINUTES` | `30` (Enforces PRD NFR-004 30-minute idle session timeout) | Server-Only |
| `DATABASE_URL` | `postgresql://...` (Provided by Vercel Postgres / Neon / Supabase) | Server-Only |
| `WHATSAPP_WEBHOOK_SECRET` | Strong random secret for verifying inbound WhatsApp Business API webhooks | Server-Only |

> [!CAUTION]
> **Never** prefix any secret variable with `NEXT_PUBLIC_`. Variables prefixed with `NEXT_PUBLIC_` are bundled into browser JavaScript.

---

### Step 5: Deploy & Verify
1. Click **Deploy** in Vercel.
2. Wait ~60 seconds for Vercel to build and assign your production HTTPS domain (e.g., `https://care-workplace-solution.vercel.app`).
3. Open your live URL and test the default accounts:
   - **Workplace Solution Admin**: `WS-001` / `AdminCare2026!`
   - **Super Admin**: `IT-001` / `SuperCare2026!`
   - **Employee (Gojek UI)**: `EMP-101` / `Employee2026!`
   - **Driver (GPS & Odo)**: `DRV-201` / `Driver2026!`
   - **Pending User (Blocked until WS Admin approves)**: `EMP-103` / `Employee2026!`
4. Log in as `WS-001` and change the default demo passwords immediately in production.
