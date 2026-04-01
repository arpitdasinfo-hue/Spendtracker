# Deep QA Checklist

Created: 2026-04-01

## Current Known Blockers

- Auth setup mismatch:
  - Live Supabase settings currently return `external.phone = false`
  - Live Supabase settings currently return `phone_autoconfirm = false`
  - Result: mobile number + password signup is intentionally blocked in the UI
- Vercel project split:
  - `spendtracker` points at the repo root and produces an empty deploy
  - `spendtracker_060795` is the correct Next.js app with `apps/web` as root

## Auth QA

- Verify sign up in a fresh incognito window
- Verify sign in with an existing mobile number
- Verify sign out from desktop top bar
- Verify sign out from mobile settings path
- Verify disabled auth state messaging when phone auth is off
- Verify no OTP copy remains in the UI
- Verify stale session redirect behavior from `/login`

## Product QA

- Verify expense, income, transfer, and repayment flows save correctly
- Verify credit card repayment is excluded from expense analytics
- Verify UPI, debit, credit, and bank-transfer rails produce the right balance changes
- Verify reset demo works only for authenticated users
- Verify budgets, recent activity, and due-card summaries render cleanly with real data

## Responsive QA

- Verify desktop top chrome on wide screens
- Verify mobile bottom tab bar on narrow screens
- Verify add flow hides the bottom tab bar
- Verify login page remains usable on mobile widths
- Verify no double navigation appears at tablet breakpoints

## Deployment QA

- Verify latest commit is live on `spendtracker_060795`
- Verify stable production URL resolves to the correct project
- Verify production env vars are present
- Verify Supabase-backed pages behave the same on Vercel and localhost
