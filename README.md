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
  - Check-out/check-in odometer & battery/fuel recording, mandatory actual passenger verification (FR-028), and active-trip-only GPS telemetry (FR-033).
- **Interactive WhatsApp Bot Simulator**:
  - Guided Bahasa Indonesia conversation flow with 3-retry fallback (FR-039 to FR-045).

## Local Development
```powershell
npm install
npm run dev
```
Open `http://localhost:3000`. See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for step-by-step Vercel deployment instructions.
