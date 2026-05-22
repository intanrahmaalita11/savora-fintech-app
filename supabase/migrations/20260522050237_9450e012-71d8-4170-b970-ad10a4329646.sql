
-- 1. Add primary key & role column to group_members
alter table public.group_members
  add column if not exists role text not null default 'member';

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'group_members_pkey'
  ) then
    alter table public.group_members add constraint group_members_pkey primary key (group_id, user_id);
  end if;
end $$;

-- 2. Attach triggers (idempotent)
drop trigger if exists trg_gs_owner_member on public.group_savings;
create trigger trg_gs_owner_member
  after insert on public.group_savings
  for each row execute function public.gs_add_owner_member();

-- update gs_add_owner_member to set role=admin
create or replace function public.gs_add_owner_member()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.group_members (group_id, user_id, role)
  values (new.id, new.owner_id, 'admin')
  on conflict (group_id, user_id) do update set role = 'admin';
  return new;
end $$;

drop trigger if exists trg_gc_recalc on public.group_contributions;
create trigger trg_gc_recalc
  after insert or update or delete on public.group_contributions
  for each row execute function public.gs_recalc_saved();

drop trigger if exists trg_fr_block_duplicate on public.friendships;
create trigger trg_fr_block_duplicate
  before insert on public.friendships
  for each row execute function public.fr_block_duplicate();

-- 3. Backfill: existing groups -> owner as admin member; recalc saved_amount
insert into public.group_members (group_id, user_id, role)
select id, owner_id, 'admin' from public.group_savings
on conflict (group_id, user_id) do update set role = 'admin';

update public.group_savings g
  set saved_amount = coalesce((select sum(amount) from public.group_contributions where group_id = g.id), 0);

-- 4. Atomic RPC to create a group saving (avoids any post-insert RLS readback issues)
create or replace function public.create_group_saving(
  _name text,
  _target numeric,
  _deadline date,
  _emoji text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _id uuid;
begin
  if _uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if _name is null or length(trim(_name)) = 0 then
    raise exception 'Name required';
  end if;
  if _target is null or _target <= 0 then
    raise exception 'Target must be positive';
  end if;

  insert into public.group_savings (owner_id, name, target_amount, deadline, emoji)
  values (_uid, trim(_name), _target, _deadline, coalesce(_emoji, '🏝️'))
  returning id into _id;

  -- ensure owner is admin member (trigger also does this, belt & suspenders)
  insert into public.group_members (group_id, user_id, role)
  values (_id, _uid, 'admin')
  on conflict (group_id, user_id) do update set role = 'admin';

  return _id;
end $$;

grant execute on function public.create_group_saving(text, numeric, date, text) to authenticated;
