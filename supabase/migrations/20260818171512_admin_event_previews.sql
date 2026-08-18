-- The admin overview needs two facts per event: the total number of photos
-- (hidden included) and four recent visible thumbnails. Pulling every photo
-- row through PostgREST just to derive those values made the response grow
-- with the whole account. Keep that aggregation beside the data instead.

-- The existing gallery index is partial (`hidden_at is null`), so it cannot
-- answer the total count when an event has moderated photos. This small index
-- makes the count an index-only scan while also supporting other host queries
-- that filter by event id.
create index if not exists photos_event_idx
  on public.photos (event_id);

create or replace function public.owned_events_with_previews()
returns table (
  id                uuid,
  slug              text,
  event_name        text,
  event_date        date,
  uploads_close_at  timestamptz,
  gallery_hidden_at timestamptz,
  created_at        timestamptz,
  photo_count       bigint,
  previews          text[]
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    e.id,
    e.slug,
    e.event_name,
    e.event_date,
    e.uploads_close_at,
    e.gallery_hidden_at,
    e.created_at,
    photo_totals.photo_count,
    coalesce(recent_photos.previews, array[]::text[]) as previews
  from public.events e
  cross join lateral (
    select count(*) as photo_count
    from public.photos p
    where p.event_id = e.id
  ) photo_totals
  left join lateral (
    select array_agg(p.thumb_path order by p.created_at desc) as previews
    from (
      select p.thumb_path, p.created_at
      from public.photos p
      where p.event_id = e.id
        and p.hidden_at is null
      order by p.created_at desc
      limit 4
    ) p
  ) recent_photos on true
  order by e.created_at desc
$$;

-- Functions are executable by PUBLIC unless explicitly revoked. This RPC
-- exposes an account-wide event list, so only authenticated callers may reach
-- it. It remains SECURITY INVOKER: the existing ownership RLS policies on both
-- tables are the authorization boundary.
revoke all on function public.owned_events_with_previews() from public;
grant execute on function public.owned_events_with_previews() to authenticated;
