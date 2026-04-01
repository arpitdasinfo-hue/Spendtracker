# Spendtracker Web

Animated finance workspace for:

- expenses
- income
- transfers
- credit card repayments
- debit card, credit card, and UPI rails
- mandates and recurring charges

The current build stores product data in Supabase and uses Google auth for sign-in.

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

### 4. Enable Google auth in Supabase

In Supabase:

1. Go to `Authentication`
2. Enable `Google`
3. Add your callback URL

Local callback URL:

```text
http://localhost:3000/auth/callback
```

Production callback URL should be:

```text
https://your-domain.com/auth/callback
```

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
