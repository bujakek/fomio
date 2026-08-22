-- A third render per photo: the one the lightbox actually shows.
--
-- The gallery grid has always been careful to serve `thumb_path` rather than
-- the master, for the reason CLAUDE.md states: tiling 4096px files at 200px
-- would have a guest pull a gigabyte to scroll one album. The lightbox was
-- never given the same treatment, so opening a photo downloaded ~2MB and, far
-- worse, decoded 12.6 megapixels into roughly 50MB of bitmap — on the phone,
-- once per swipe. That is the second-largest source of heat in the product,
-- after the animated background blur this migration ships alongside.
--
-- A phone screen is ~1200px on its long edge at 3x. 1600px covers it with room
-- for pinch-zoom and costs about an eighth of the pixels to decode.
--
-- `storage_path` keeps its job unchanged: it is the print-ready master, and it
-- is what the ZIP export hands the couple. Nothing here touches it.

alter table public.photos
  add column view_path text;

comment on column public.photos.view_path is
  'Screen-sized render (~1600px) for the lightbox. Null for photos uploaded before this column existed — readers must fall back to storage_path.';

-- Nullable, and staying that way. Every photo already in an album predates the
-- upload pipeline that produces this render, and backfilling would mean
-- re-downloading and re-encoding masters server-side to save a decode the host
-- has already paid for. Readers fall back to `storage_path` instead, which is
-- exactly the behaviour those photos have today.

-- ---------------------------------------------------------------------------
-- Both guest read paths gain the column
-- ---------------------------------------------------------------------------
--
-- Dropped rather than `create or replace`d: Postgres refuses to replace a
-- function whose OUT parameters change, and adding a column to a `returns
-- table` is exactly that. Dropping takes the grants with it, so they are
-- restated below — the same `revoke all from public` then `grant to anon,
-- authenticated` shape the originals used.
--
-- The two stay column-for-column identical, as they were before, so
-- `GalleryPhoto` remains one TypeScript type over both.

drop function if exists public.event_photos(uuid);

create function public.event_photos(p_event_id uuid)
returns table (
  id            uuid,
  storage_path  text,
  thumb_path    text,
  view_path     text,
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
  select p.id, p.storage_path, p.thumb_path, p.view_path, p.uploader_name,
         p.width, p.height, p.created_at
  from public.photos p
  join public.events e on e.id = p.event_id
  where p.event_id = p_event_id
    and p.hidden_at is null
    and e.gallery_hidden_at is null
  order by p.created_at desc
$$;

comment on function public.event_photos(uuid) is
  'Visible photos for one event. Excludes hidden photos and returns nothing while the gallery is closed.';

revoke all on function public.event_photos(uuid) from public;
grant execute on function public.event_photos(uuid) to anon, authenticated;

drop function if exists public.event_gallery_by_slug(text);

create function public.event_gallery_by_slug(p_slug text)
returns table (
  id            uuid,
  storage_path  text,
  thumb_path    text,
  view_path     text,
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
  select p.id, p.storage_path, p.thumb_path, p.view_path, p.uploader_name,
         p.width, p.height, p.created_at
  from public.photos p
  join public.events e on e.id = p.event_id
  where e.slug = p_slug
    and p.hidden_at is null
    and e.gallery_hidden_at is null
  order by p.created_at desc
$$;

comment on function public.event_gallery_by_slug(text) is
  'Visible photos for one event, keyed on slug so the gallery does not have to resolve the event id first. Same visibility rules as event_photos().';

revoke all on function public.event_gallery_by_slug(text) from public;
grant execute on function public.event_gallery_by_slug(text) to anon, authenticated;

-- Storage needs no change. Every policy on storage.objects keys on the first
-- path segment (the event id) and never on the filename, so `{photo_id}_view.jpg`
-- is already covered by the same insert policy that admits the master and the
-- thumb. The photo cap is unaffected too: it counts rows in `photos`, not
-- objects in the bucket, so a third object per photo does not consume quota.
