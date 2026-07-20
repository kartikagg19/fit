# FitMore — Product Requirements Document

## Original Problem Statement
Build FitMore — a modern, production-ready Gym Management SaaS "business operating system" for gyms, fitness centers, personal training studios, CrossFit boxes, yoga studios, and fitness clubs. Roles: gym owner, branch manager, reception staff, personal trainer, members. Modules: Member Management, Membership Management, Daily Check-in (QR/ID/RFID/mobile/reception — no biometric hardware), Attendance Tracking, Trainer Management, Workout Management, Diet Planning, Payment & Billing, Invoice Generation, Expense Tracking, Revenue Analytics, Reports, Notifications, Inventory, Staff, Multi-Branch, CRM/Leads, Settings.

## User Choices (initial build)
- Auth: JWT-based custom auth (email + password)
- First-pass polish focus: Member Management + Memberships + Check-in + Payments/Invoices + Revenue Analytics + Expenses
- Payments: manual tracking (no Stripe/Razorpay in v1)
- Seed rich demo data: YES
- Theme: bold, distinctive premium aesthetic → "Performance Pro" tactical dark theme (Oswald headings, DM Sans body, red #FF3B30 primary)

## Architecture
- Backend: FastAPI + Motor (MongoDB async), single `server.py` for v1, JWT httpOnly cookies (samesite=none, secure=true), UUID string IDs.
- Frontend: React 19 + React Router v7 + Tailwind + shadcn/ui + Recharts + Sonner toasts. `@/`-alias imports.
- All backend routes under `/api`. Cookies via `axios.withCredentials`.

## User Personas
- **Owner** — full access to everything (KPIs, staff, plans, branches).
- **Manager** — operations + finance for own branch (no staff creation).
- **Receptionist** — check-ins, member creation, payments, lead capture.
- **Trainer** — read own schedule/members (v2).
- **Member** — self-check-in / view membership (v2 mobile app surface).

## What's Implemented (v1 — 2026-07-20)
- JWT auth (login/logout/me), owner + 3 seeded staff users, role guards (403 on unauthorised writes).
- Dashboard "Command Deck" — KPIs, 6-month revenue-vs-expense area chart, 7-day attendance bars, plan-mix donut, recent check-ins & payments, expiring-soon alert.
- Members directory — search, status filter, hydrated plan/branch/trainer, "New Member" dialog with auto expiry calc; Member detail page with check-in + payment history.
- Membership Plans catalog with pricing cards + custom-plan creator.
- Check-in Kiosk — QR, Member ID, Mobile, RFID, Manual methods; auto-focus scanner input; live activity feed; today counter.
- Attendance — daily bars, day×hour heatmap, log.
- Trainers roster with rate + experience.
- Payments & Invoices — record payment, auto-generate invoice number, printable white invoice preview.
- Expenses — categorised ledger with per-category totals.
- Reports — 12-month revenue trend, revenue-vs-expense bars, plan pie, margin KPI.
- CRM Leads — 5-column kanban (new → contacted → trial → converted → lost) with inline stage change.
- Branches (multi-location), Notifications inbox, Settings.
- Seeded: 4 plans, 5 trainers, 3 branches, 38 members, ~140 payments, ~650 check-ins, 60 expenses, 28 leads, 5 notifications.

## Prioritized Backlog
### P0 (next iteration)
- Workout Management module (routines, exercises library, assignments).
- Diet Planning module.
- Inventory Management (supplements/merchandise stock).
- Password reset flow + change-password in Settings.

### P1
- Trainer schedule & booking calendar.
- Real payment gateway (Stripe / Razorpay).
- Member mobile self-check-in QR page.
- SMS/WhatsApp reminders for expiring memberships.
- CSV export from every table + PDF invoice download.

### P2
- Reports drill-down + custom date ranges.
- Multi-currency, multi-locale.
- Biometric device integration (already API-ready via /api/checkins).
- Public marketing landing page.
