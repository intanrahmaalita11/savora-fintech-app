
revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_owner_list" on storage.objects for select
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
