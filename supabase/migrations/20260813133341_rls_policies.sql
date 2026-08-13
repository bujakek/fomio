-- Opens up the schema locked by the previous migration.
--
-- Guests are never signed in and the anon key ships in the browser bundle, so
-- anything anon can SELECT through PostgREST, anyone on the internet can list.
-- A plain `using (true)` read policy on events would therefore expose
-- `GET /rest/v1/events?select=slug` — every album in the system — which would
-- make the unguessable slug suffix pointless and contradict the FAQ's promise
-- that albums are private.
--
-- So guests get no table reads at all. They read through security-definer
-- functions that require the slug or the event id as an argument: you can
-- fetch an album you know the address of, and there is nothing to enumerate.

-- ---------------------------------------------------------------------------
-- Read paths for guests
-- ---------------------------------------------------------------------------

-- Note the omitted column: owner_id is never returned. Guests have no reason
-- to learn the host's auth user id.
create or replace function public.event_by_slug(p_slug text)
returns table (
  id               uuid,
  slug             text,
  event_name       text,
  event_date       date,
  uploads_close_at timestamptz,
  created_at       timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.slug, e.event_name, e.event_date, e.uploads_close_at, e.created_at
  from public.events e
  where e.slug = p_slug
$$;

create or replace function public.event_photos(p_event_id uuid)
returns table (
  id            uuid,
  storage_path  text,
  thumb_path    text,
  uploader_name text,
  width         integer,
  height        integer,
  created_at    timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.storage_path, p.thumb_path, p.uploader_name,
         p.width, p.height, p.created_at
  from public.photos p
  where p.event_id = p_event_id
    and p.hidden_at is null
  order by p.created_at desc
$$;

-- Used by the guest INSERT policy below. It has to be security definer:
-- policy expressions are evaluated as the invoking role, so an inline
-- `exists (select 1 from public.events …)` would be filtered by events' own
-- RLS — and since guests cannot read events, it would silently evaluate false
-- and every upload would fail its `with check`.
create or replace function public.event_accepts_uploads(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.events e
    where e.id = p_event_id
      and (e.uploads_close_at is null or e.uploads_close_at > now())
  )
$$;

revoke all on function public.event_by_slug(text) from public;
revoke all on function public.event_photos(uuid) from public;
revoke all on function public.event_accepts_uploads(uuid) from public;

grant execute on function public.event_by_slug(text) to anon, authenticated;
grant execute on function public.event_photos(uuid) to anon, authenticated;
grant execute on function public.event_accepts_uploads(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------------

-- events: no anon policy at all, so guests get zero rows from the table.
-- Hosts see and manage only what they own.
create policy "host manages own events"
  on public.events for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- photos: guests may add to an open event and do nothing else. No update and
-- no delete, so a guest cannot alter or remove someone else's photo, and
-- `hidden_at is null` stops them inserting a pre-moderated row.
--
-- Because guests have no SELECT policy here, an insert must not ask for the
-- row back: supabase-js `.insert()` alone sends `Prefer: return=minimal` and
-- succeeds, while chaining `.select()` would ask to read what it just wrote
-- and come back empty.
create policy "guests add photos while uploads are open"
  on public.photos for insert to anon
  with check (
    hidden_at is null
    and public.event_accepts_uploads(event_id)
  );

-- The host's own events are readable to them, so this inline exists() is fine
-- here where it would not be for anon.
create policy "host manages photos in own events"
  on public.photos for all to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = photos.event_id and e.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.events e
      where e.id = photos.event_id and e.owner_id = auth.uid()
    )
  );
