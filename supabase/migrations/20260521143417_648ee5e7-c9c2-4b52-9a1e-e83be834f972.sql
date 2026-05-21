
-- =========== FRIENDSHIPS ===========
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null,
  addressee_id uuid not null,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);
alter table public.friendships enable row level security;

create policy "fr_select" on public.friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy "fr_insert" on public.friendships for insert
  with check (auth.uid() = requester_id);
create policy "fr_update" on public.friendships for update
  using (auth.uid() = addressee_id or auth.uid() = requester_id);
create policy "fr_delete" on public.friendships for delete
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- =========== GROUP SAVINGS ===========
create table public.group_savings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  name text not null,
  target_amount numeric not null,
  saved_amount numeric not null default 0,
  deadline date,
  emoji text default '🏝️',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.group_savings enable row level security;

create table public.group_members (
  group_id uuid not null references public.group_savings(id) on delete cascade,
  user_id uuid not null,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
alter table public.group_members enable row level security;

create table public.group_contributions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.group_savings(id) on delete cascade,
  user_id uuid not null,
  amount numeric not null,
  note text,
  created_at timestamptz not null default now()
);
alter table public.group_contributions enable row level security;

-- =========== Security-definer helpers (avoid recursive RLS) ===========
create or replace function public.is_group_member(_gid uuid, _uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.group_members where group_id = _gid and user_id = _uid)
      or exists(select 1 from public.group_savings  where id = _gid and owner_id = _uid);
$$;

create or replace function public.is_friend(_a uuid, _b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.friendships
    where status = 'accepted'
      and ((requester_id = _a and addressee_id = _b)
        or (requester_id = _b and addressee_id = _a))
  );
$$;

create or replace function public.shares_group(_a uuid, _b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.group_members m1
    join public.group_members m2 on m1.group_id = m2.group_id
    where m1.user_id = _a and m2.user_id = _b
  );
$$;

create or replace function public.find_user_by_email(_email text)
returns table(id uuid, display_name text, avatar_url text)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.avatar_url
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(u.email) = lower(_email)
  limit 1;
$$;

-- =========== GROUP RLS POLICIES ===========
create policy "gs_select" on public.group_savings for select
  using (public.is_group_member(id, auth.uid()));
create policy "gs_insert" on public.group_savings for insert
  with check (auth.uid() = owner_id);
create policy "gs_update" on public.group_savings for update
  using (auth.uid() = owner_id);
create policy "gs_delete" on public.group_savings for delete
  using (auth.uid() = owner_id);

create policy "gm_select" on public.group_members for select
  using (public.is_group_member(group_id, auth.uid()));
create policy "gm_insert" on public.group_members for insert
  with check (
    auth.uid() = user_id
    or exists (select 1 from public.group_savings g where g.id = group_id and g.owner_id = auth.uid())
  );
create policy "gm_delete" on public.group_members for delete
  using (
    auth.uid() = user_id
    or exists (select 1 from public.group_savings g where g.id = group_id and g.owner_id = auth.uid())
  );

create policy "gc_select" on public.group_contributions for select
  using (public.is_group_member(group_id, auth.uid()));
create policy "gc_insert" on public.group_contributions for insert
  with check (auth.uid() = user_id and public.is_group_member(group_id, auth.uid()));
create policy "gc_delete" on public.group_contributions for delete
  using (auth.uid() = user_id);

-- =========== Profile visibility for friends & group mates ===========
create policy "profiles_select_friends" on public.profiles for select
  using (public.is_friend(auth.uid(), id));
create policy "profiles_select_group_mates" on public.profiles for select
  using (public.shares_group(auth.uid(), id));

-- =========== Keep saved_amount in sync ===========
create or replace function public.gs_recalc_saved()
returns trigger language plpgsql security definer set search_path = public as $$
declare _gid uuid;
begin
  _gid := coalesce(new.group_id, old.group_id);
  update public.group_savings
    set saved_amount = coalesce((select sum(amount) from public.group_contributions where group_id = _gid), 0),
        updated_at = now()
    where id = _gid;
  return null;
end $$;

create trigger gc_after_change
after insert or update or delete on public.group_contributions
for each row execute function public.gs_recalc_saved();
