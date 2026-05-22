
-- Attach recompute trigger so group savings progress updates on every contribution
drop trigger if exists trg_gc_recalc on public.group_contributions;
create trigger trg_gc_recalc
after insert or update or delete on public.group_contributions
for each row execute function public.gs_recalc_saved();

-- Auto-add owner as a member so RLS visibility & member lists are consistent
create or replace function public.gs_add_owner_member()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.group_members (group_id, user_id)
  values (new.id, new.owner_id)
  on conflict do nothing;
  return new;
end $$;

drop trigger if exists trg_gs_owner_member on public.group_savings;
create trigger trg_gs_owner_member
after insert on public.group_savings
for each row execute function public.gs_add_owner_member();

-- Prevent duplicate / reverse-direction friend requests
create or replace function public.fr_block_duplicate()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from public.friendships
    where (requester_id = new.requester_id and addressee_id = new.addressee_id)
       or (requester_id = new.addressee_id and addressee_id = new.requester_id)
  ) then
    raise exception 'Friend request already exists' using errcode = '23505';
  end if;
  return new;
end $$;

drop trigger if exists trg_fr_block_duplicate on public.friendships;
create trigger trg_fr_block_duplicate
before insert on public.friendships
for each row execute function public.fr_block_duplicate();

-- Backfill: make sure all existing group owners are members
insert into public.group_members (group_id, user_id)
select id, owner_id from public.group_savings
on conflict do nothing;

-- Backfill saved_amount for any existing groups
update public.group_savings g
set saved_amount = coalesce((select sum(amount) from public.group_contributions where group_id = g.id), 0);
