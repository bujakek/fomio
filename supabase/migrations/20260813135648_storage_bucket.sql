-- Storage for guest photos.
--
-- Layout: event-photos/{event_id}/{photo_id}.jpg for the full-resolution file
-- and {photo_id}_thumb.jpg beside it. The first path segment is always the
-- event id and every policy below depends on that, so never flatten it.
--
-- The bucket is public, which in Supabase means the /object/public/ route
-- serves files without consulting RLS. Privacy comes from the path: two
-- unguessable uuids. That is the same bet the event slug makes.
--
-- Public download does NOT require a select policy on storage.objects, and we
-- deliberately do not grant one to anon. A select policy governs *listing*,
-- and `using (bucket_id = 'event-photos')` would let anyone call
-- POST /storage/v1/object/list/event-photos and walk every event id and photo
-- id in the system — the same enumeration hole the table policies avoid, and
-- it would hand over every album regardless of how unguessable the slug is.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-photos', 'event-photos', true, 15728640, array['image/jpeg'])
on conflict (id) do nothing;

-- Guest uploads must land in a folder belonging to a real event that is still
-- accepting them. This needs to be security definer for the same reason
-- event_accepts_uploads() does: a policy expression runs as the invoking role,
-- and anon cannot read events, so an inline subquery would evaluate false and
-- silently reject every upload.
--
-- Compares the folder as text rather than casting it to uuid. Guests control
-- this path, and a malformed segment would make a cast raise an error instead
-- of cleanly failing the check.
create or replace function public.event_folder_accepts_uploads(p_folder text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.events e
    where e.id::text = p_folder
      and (e.uploads_close_at is null or e.uploads_close_at > now())
  )
$$;

revoke all on function public.event_folder_accepts_uploads(text) from public;
grant execute on function public.event_folder_accepts_uploads(text) to anon, authenticated;

create policy "guests upload into an open event folder"
  on storage.objects for insert to anon
  with check (
    bucket_id = 'event-photos'
    and public.event_folder_accepts_uploads((storage.foldername(name))[1])
  );

-- No update and no delete for anon: a guest cannot overwrite or remove another
-- guest's photo even knowing its exact path.

-- The host can read their own events, so an inline subquery is safe here in a
-- way it is not for anon. Still compared as text, for the same cast reason.
create policy "host manages objects in own events"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'event-photos'
    and (storage.foldername(name))[1] in (
      select e.id::text from public.events e where e.owner_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'event-photos'
    and (storage.foldername(name))[1] in (
      select e.id::text from public.events e where e.owner_id = auth.uid()
    )
  );
