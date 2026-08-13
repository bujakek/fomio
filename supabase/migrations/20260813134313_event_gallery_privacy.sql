-- Lets the host close the gallery to guests while still accepting uploads.
--
-- Guests keep contributing; they just cannot browse what has been contributed.
-- The host can toggle it either way at any time, which is why this is a
-- nullable timestamp rather than a one-way flag: null = guests can view.
-- It also records *when* the gallery was closed, which a boolean would lose.
--
-- Enforced in the database, not the UI. Hiding the gallery link while
-- event_photos() still answered would be decoration — the RPC is a public
-- endpoint and anyone could call it directly.

alter table public.events
  add column gallery_hidden_at timestamptz;

comment on column public.events.gallery_hidden_at is
  'Null = guests may view the gallery. Set = uploads still accepted, viewing refused. Host-togglable both ways.';

-- Return type gains a column, so this needs a drop rather than a replace;
-- grants go with the old function and have to be reissued.
drop function if exists public.event_by_slug(text);

create function public.event_by_slug(p_slug text)
returns table (
  id               uuid,
  slug             text,
  event_name       text,
  event_date       date,
  uploads_close_at timestamptz,
  gallery_private  boolean,
  created_at       timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.slug, e.event_name, e.event_date, e.uploads_close_at,
         (e.gallery_hidden_at is not null) as gallery_private,
         e.created_at
  from public.events e
  where e.slug = p_slug
$$;

-- Returns nothing at all while the gallery is closed. The guest-facing UI
-- should read gallery_private from event_by_slug() and explain the state,
-- rather than presenting an empty album as though nobody had uploaded.
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
  join public.events e on e.id = p.event_id
  where p.event_id = p_event_id
    and p.hidden_at is null
    and e.gallery_hidden_at is null
  order by p.created_at desc
$$;

revoke all on function public.event_by_slug(text) from public;
grant execute on function public.event_by_slug(text) to anon, authenticated;
