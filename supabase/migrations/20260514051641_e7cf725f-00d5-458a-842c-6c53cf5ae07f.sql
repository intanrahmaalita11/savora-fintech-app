
-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  currency text not null default 'IDR',
  theme text not null default 'light',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Transactions
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income','expense')),
  amount numeric(14,2) not null check (amount >= 0),
  category text not null,
  note text,
  occurred_at date not null default current_date,
  created_at timestamptz not null default now()
);
create index transactions_user_date_idx on public.transactions(user_id, occurred_at desc);
alter table public.transactions enable row level security;
create policy "tx_select_own" on public.transactions for select using (auth.uid() = user_id);
create policy "tx_insert_own" on public.transactions for insert with check (auth.uid() = user_id);
create policy "tx_update_own" on public.transactions for update using (auth.uid() = user_id);
create policy "tx_delete_own" on public.transactions for delete using (auth.uid() = user_id);

-- Budgets
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period text not null check (period in ('daily','weekly','monthly')),
  amount numeric(14,2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, period)
);
alter table public.budgets enable row level security;
create policy "bud_select_own" on public.budgets for select using (auth.uid() = user_id);
create policy "bud_insert_own" on public.budgets for insert with check (auth.uid() = user_id);
create policy "bud_update_own" on public.budgets for update using (auth.uid() = user_id);
create policy "bud_delete_own" on public.budgets for delete using (auth.uid() = user_id);

-- Savings Goals
create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric(14,2) not null check (target_amount > 0),
  saved_amount numeric(14,2) not null default 0,
  deadline date,
  emoji text default '🎯',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.savings_goals enable row level security;
create policy "sg_select_own" on public.savings_goals for select using (auth.uid() = user_id);
create policy "sg_insert_own" on public.savings_goals for insert with check (auth.uid() = user_id);
create policy "sg_update_own" on public.savings_goals for update using (auth.uid() = user_id);
create policy "sg_delete_own" on public.savings_goals for delete using (auth.uid() = user_id);

-- Savings Contributions
create table public.savings_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.savings_goals(id) on delete cascade,
  amount numeric(14,2) not null,
  note text,
  created_at timestamptz not null default now()
);
alter table public.savings_contributions enable row level security;
create policy "sc_select_own" on public.savings_contributions for select using (auth.uid() = user_id);
create policy "sc_insert_own" on public.savings_contributions for insert with check (auth.uid() = user_id);
create policy "sc_update_own" on public.savings_contributions for update using (auth.uid() = user_id);
create policy "sc_delete_own" on public.savings_contributions for delete using (auth.uid() = user_id);

-- Notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  kind text not null default 'info',
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notif_user_idx on public.notifications(user_id, created_at desc);
alter table public.notifications enable row level security;
create policy "n_select_own" on public.notifications for select using (auth.uid() = user_id);
create policy "n_insert_own" on public.notifications for insert with check (auth.uid() = user_id);
create policy "n_update_own" on public.notifications for update using (auth.uid() = user_id);
create policy "n_delete_own" on public.notifications for delete using (auth.uid() = user_id);

-- Auto profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Avatars storage bucket
insert into storage.buckets (id, name, public) values ('avatars','avatars', true)
on conflict (id) do nothing;

create policy "avatars_public_read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars_user_upload" on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "avatars_user_update" on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "avatars_user_delete" on storage.objects for delete
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
