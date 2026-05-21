
revoke execute on function public.find_user_by_email(text) from anon, public;
grant execute on function public.find_user_by_email(text) to authenticated;
revoke execute on function public.is_group_member(uuid, uuid) from anon, public;
revoke execute on function public.is_friend(uuid, uuid) from anon, public;
revoke execute on function public.shares_group(uuid, uuid) from anon, public;
grant execute on function public.is_group_member(uuid, uuid) to authenticated;
grant execute on function public.is_friend(uuid, uuid) to authenticated;
grant execute on function public.shares_group(uuid, uuid) to authenticated;
