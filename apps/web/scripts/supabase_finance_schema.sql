create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.finance_accounts (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  provider text not null,
  mask text not null,
  type text not null check (type in ('cash', 'bank', 'credit_card', 'credit_line')),
  current_balance numeric(14,2) not null default 0,
  credit_limit numeric(14,2),
  statement_day integer,
  due_day integer,
  color text not null,
  rail_hint text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.finance_budgets (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  limit_amount numeric(14,2) not null default 0,
  color text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.finance_goals (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target numeric(14,2) not null default 0,
  saved numeric(14,2) not null default 0,
  due_month text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.finance_mandates (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  merchant_name text not null,
  mandate_type text not null check (mandate_type in ('upi_autopay', 'debit_card_emandate', 'credit_card_emandate')),
  payment_rail text not null check (payment_rail in ('cash', 'upi', 'card', 'bank_transfer', 'auto_debit')),
  funding_source_type text not null check (funding_source_type in ('cash_wallet', 'bank_account', 'credit_card', 'credit_line')),
  source_account_id text not null references public.finance_accounts(id) on delete cascade,
  destination_account_id text references public.finance_accounts(id) on delete set null,
  amount_type text not null check (amount_type in ('fixed', 'variable')),
  amount numeric(14,2) not null default 0,
  frequency text not null,
  next_trigger_at timestamptz not null,
  status text not null check (status in ('active', 'paused', 'draft')),
  note text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.finance_transactions (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  merchant text not null,
  category text not null,
  type text not null check (type in ('expense', 'income', 'transfer', 'repayment')),
  amount numeric(14,2) not null check (amount > 0),
  payment_rail text not null check (payment_rail in ('cash', 'upi', 'card', 'bank_transfer', 'auto_debit')),
  funding_source_type text not null check (funding_source_type in ('cash_wallet', 'bank_account', 'credit_card', 'credit_line')),
  from_account_id text references public.finance_accounts(id) on delete set null,
  to_account_id text references public.finance_accounts(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  note text not null default '',
  source_label text not null,
  status text not null default 'posted' check (status in ('posted', 'scheduled')),
  origin text not null default 'manual' check (origin in ('manual', 'mandate', 'seed')),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists finance_accounts_user_idx on public.finance_accounts (user_id);
create index if not exists finance_budgets_user_idx on public.finance_budgets (user_id);
create index if not exists finance_goals_user_idx on public.finance_goals (user_id);
create index if not exists finance_mandates_user_idx on public.finance_mandates (user_id);
create index if not exists finance_transactions_user_idx on public.finance_transactions (user_id, created_at desc);

drop trigger if exists finance_accounts_set_updated_at on public.finance_accounts;
create trigger finance_accounts_set_updated_at
before update on public.finance_accounts
for each row execute function public.set_updated_at();

drop trigger if exists finance_budgets_set_updated_at on public.finance_budgets;
create trigger finance_budgets_set_updated_at
before update on public.finance_budgets
for each row execute function public.set_updated_at();

drop trigger if exists finance_goals_set_updated_at on public.finance_goals;
create trigger finance_goals_set_updated_at
before update on public.finance_goals
for each row execute function public.set_updated_at();

drop trigger if exists finance_mandates_set_updated_at on public.finance_mandates;
create trigger finance_mandates_set_updated_at
before update on public.finance_mandates
for each row execute function public.set_updated_at();

drop trigger if exists finance_transactions_set_updated_at on public.finance_transactions;
create trigger finance_transactions_set_updated_at
before update on public.finance_transactions
for each row execute function public.set_updated_at();

alter table public.finance_accounts enable row level security;
alter table public.finance_budgets enable row level security;
alter table public.finance_goals enable row level security;
alter table public.finance_mandates enable row level security;
alter table public.finance_transactions enable row level security;

drop policy if exists "finance_accounts_owner" on public.finance_accounts;
create policy "finance_accounts_owner"
on public.finance_accounts
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "finance_budgets_owner" on public.finance_budgets;
create policy "finance_budgets_owner"
on public.finance_budgets
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "finance_goals_owner" on public.finance_goals;
create policy "finance_goals_owner"
on public.finance_goals
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "finance_mandates_owner" on public.finance_mandates;
create policy "finance_mandates_owner"
on public.finance_mandates
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "finance_transactions_owner" on public.finance_transactions;
create policy "finance_transactions_owner"
on public.finance_transactions
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.apply_finance_entry(
  p_title text,
  p_merchant text,
  p_category text,
  p_type text,
  p_amount numeric,
  p_payment_rail text,
  p_funding_source_id text default null,
  p_destination_account_id text default null,
  p_note text default ''
)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_funding finance_accounts%rowtype;
  v_destination finance_accounts%rowtype;
  v_transaction_id text := gen_random_uuid()::text;
  v_funding_source_type text := 'bank_account';
  v_source_label text := 'Spend view';
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  if p_type not in ('expense', 'income', 'transfer', 'repayment') then
    raise exception 'Unsupported entry type';
  end if;

  if p_payment_rail not in ('cash', 'upi', 'card', 'bank_transfer', 'auto_debit') then
    raise exception 'Unsupported payment rail';
  end if;

  if p_funding_source_id is not null then
    select *
      into v_funding
      from public.finance_accounts
     where id = p_funding_source_id
       and user_id = v_user_id;

    if not found then
      raise exception 'Funding account not found';
    end if;

    v_funding_source_type := case v_funding.type
      when 'cash' then 'cash_wallet'
      when 'credit_card' then 'credit_card'
      when 'credit_line' then 'credit_line'
      else 'bank_account'
    end;
  end if;

  if p_destination_account_id is not null then
    select *
      into v_destination
      from public.finance_accounts
     where id = p_destination_account_id
       and user_id = v_user_id;

    if not found then
      raise exception 'Destination account not found';
    end if;
  end if;

  if p_type in ('expense', 'transfer', 'repayment') and p_funding_source_id is null then
    raise exception 'Funding account is required';
  end if;

  if p_type in ('income', 'transfer', 'repayment') and p_destination_account_id is null then
    raise exception 'Destination account is required';
  end if;

  if p_type = 'income' then
    v_source_label := 'Income';
  elsif p_type = 'transfer' then
    v_source_label := 'Internal move';
  elsif p_type = 'repayment' then
    v_source_label := 'Liability repayment';
  end if;

  insert into public.finance_transactions (
    id,
    user_id,
    title,
    merchant,
    category,
    type,
    amount,
    payment_rail,
    funding_source_type,
    from_account_id,
    to_account_id,
    note,
    source_label,
    status,
    origin
  ) values (
    v_transaction_id,
    v_user_id,
    coalesce(nullif(trim(p_title), ''), p_category),
    coalesce(nullif(trim(p_merchant), ''), coalesce(nullif(trim(p_title), ''), p_category)),
    p_category,
    p_type,
    p_amount,
    p_payment_rail,
    v_funding_source_type,
    p_funding_source_id,
    p_destination_account_id,
    coalesce(p_note, ''),
    v_source_label,
    'posted',
    'manual'
  );

  if p_type = 'expense' then
    if v_funding.type in ('credit_card', 'credit_line') then
      update public.finance_accounts
         set current_balance = current_balance + p_amount
       where id = v_funding.id;
    else
      update public.finance_accounts
         set current_balance = current_balance - p_amount
       where id = v_funding.id;
    end if;
  elsif p_type = 'income' then
    update public.finance_accounts
       set current_balance = current_balance + p_amount
     where id = v_destination.id;
  elsif p_type = 'transfer' then
    update public.finance_accounts
       set current_balance = current_balance - p_amount
     where id = v_funding.id;

    update public.finance_accounts
       set current_balance = current_balance + p_amount
     where id = v_destination.id;
  elsif p_type = 'repayment' then
    update public.finance_accounts
       set current_balance = current_balance - p_amount
     where id = v_funding.id;

    update public.finance_accounts
       set current_balance = greatest(0, current_balance - p_amount)
     where id = v_destination.id;
  end if;

  return v_transaction_id;
end;
$$;

grant execute on function public.apply_finance_entry(text, text, text, text, numeric, text, text, text, text) to authenticated;
