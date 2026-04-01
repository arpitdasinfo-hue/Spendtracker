# Spendtracker Web

Animated finance workspace for:

- expenses
- income
- transfers
- credit card repayments
- debit card, credit card, and UPI rails
- mandates and recurring charges

The current build stores product data in Supabase and uses mobile number + password auth at the UI layer.
Under the hood, the app maps each normalized mobile number to a private email/password identity in Supabase Auth and stores the mobile number in user metadata.

## Quick Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Add environment variables

Create `apps/web/.env.local` from `apps/web/.env.example`.

```bash
cp .env.example .env.local
```

Required variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### 3. Run the Supabase SQL

Open the Supabase SQL editor and run:

[`apps/web/scripts/supabase_finance_schema.sql`](./scripts/supabase_finance_schema.sql)

This creates:

- `finance_accounts`
- `finance_transactions`
- `finance_budgets`
- `finance_goals`
- `finance_mandates`
- the `apply_finance_entry(...)` RPC
- row-level security policies

### 4. Configure no-OTP mobile auth

Recommended:

1. Add `SUPABASE_SERVICE_ROLE_KEY` to `apps/web/.env.local`
2. Add the same `SUPABASE_SERVICE_ROLE_KEY` in Vercel production env vars
3. Keep `Authentication -> Phone` turned off unless you explicitly want real SMS auth
4. Keep `Authentication -> Email` enabled, because the app uses email/password under the hood

Fallback if you do not want to use the service-role signup route:

1. Open `Authentication -> Email`
2. Turn off email confirmation

That fallback still avoids OTP and Twilio, but the recommended service-role route gives the cleanest direct account creation flow without depending on inbox confirmation.

### 5. Start the app

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Product Data Model

The app separates:

- `entry type`: expense, income, transfer, repayment
- `payment rail`: UPI, card, bank transfer, cash, AutoPay
- `funding source`: bank account, credit card, cash wallet, or credit line

Important product rule:

`Credit card repayment is not recorded as expense if the original card purchase was already recorded as expense.`

## Helpful Files

- [`app/dashboard/page.tsx`](./app/dashboard/page.tsx)
- [`components/finance/FinanceProvider.tsx`](./components/finance/FinanceProvider.tsx)
- [`components/finance/AddEntryWorkflow.tsx`](./components/finance/AddEntryWorkflow.tsx)
- [`lib/finance.ts`](./lib/finance.ts)
- [`lib/finance-supabase.ts`](./lib/finance-supabase.ts)
- [`scripts/supabase_finance_schema.sql`](./scripts/supabase_finance_schema.sql)

## Verification

These commands were run successfully:

```bash
pnpm exec eslint . --max-warnings=0
pnpm build
```
