# CARE System — Corporate Operational Car Booking System (Workplace Solution)

Internal corporate operational car booking, driver dispatch, live GPS trip telemetry, and fleet PDF reporting platform managed by **Workplace Solution**.

## Key Features
- **Workplace Solution Admin Dashboard**:
  - One-click **Fleet Trip PDF Report** generator (`jsPDF` + `jspdf-autotable`) & **Excel/CSV Export**.
  - **Account Registration Approval Gate**: Every new user registration starts as `PENDING_APPROVAL` and requires approval from a **Workplace Solution Admin**.
  - **Full User & Role Control**: Approve, reject, deactivate/reactivate users, and assign roles (`EMPLOYEE`, `DRIVER`, `WORKPLACE_ADMIN`, `SUPER_ADMIN`).
  - **Dynamic Car Types & Fleet Management**: Add/edit Gojek-style car categories and manage the 8+ operational vehicles (3 Hyundai Ioniq 5 EV + 5 Hyundai Stargazer Petrol) and maintenance blocks.
- **Gojek-Inspired UX with Samsung One UI Design**:
  - Samsung Deep Navy (`#1428A0`) & Electric Blue (`#0066FF`) palette with `Plus Jakarta Sans` typography.
  - Gojek-style car-type selector cards, conflict-aware alternative slot recommendations, and 1.2x EV range warnings.
- **Driver Trip Execution & Live GPS Tracking**:
  - Check-out/check-in odometer & battery/fuel recording, mandatory actual passenger verification (FR-028), and active-trip-only GPS telemetry (FR-033) with strict assigned-driver authorization.
- **Interactive WhatsApp Bot Simulator**:
  - Guided Bahasa Indonesia conversation flow with 3-retry fallback (FR-039 to FR-045) in `Asia/Jakarta` (WIB) timezone.
- **Production-Hardened Security & Dual-Engine Persistence**:
  - Full Prisma PostgreSQL persistence (`prisma/schema.prisma`) when `DATABASE_URL` is configured, with automatic local `.data-store.json` fallback for zero-setup local testing.
  - Zero frontend secrets, mandatory production `JWT_SECRET`, PBKDF2-SHA256 100k-iteration password hashing, CSRF Origin verification, database-backed brute-force rate limiting, and `0` npm audit vulnerabilities.

## Local Development
1. Copy `.env.example` to `.env.local` and set your local passwords (`INITIAL_ADMIN_PASSWORD`, etc.) and `JWT_SECRET` (if omitted in dev, a random session password is generated and printed in the server terminal):
   ```powershell
   cp .env.example .env.local
   ```
2. Install dependencies and start the server:
   ```powershell
   npm install --legacy-peer-deps
   npm run dev
   ```
3. Open `http://localhost:3000`. See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for step-by-step Vercel + PostgreSQL deployment instructions.
