-- Guest insert policies were `to anon` only. That is wrong for the product:
-- guests have no accounts, but the couple (and anyone testing) often is signed
-- in, because they just came from /admin. iOS Camera opens a scanned QR in
-- Safari, which shares that session; a link opened from Messages does not.
-- Storage then sees `authenticated` rather than `anon`, the insert policy does
-- not apply, and the upload fails with 42501 even though the event is open.
--
-- Being signed in must not take away the right to upload as a guest. Host
-- ownership policies still govern update/delete/list; this only widens insert.

drop policy "guests add photos while uploads are open" on public.photos;
create policy "guests add photos while uploads are open"
  on public.photos for insert to anon, authenticated
  with check (
    hidden_at is null
    and public.event_accepts_uploads(event_id)
  );

drop policy "guests upload into an open event folder" on storage.objects;
create policy "guests upload into an open event folder"
  on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'event-photos'
    and public.event_folder_accepts_uploads((storage.foldername(name))[1])
  );
