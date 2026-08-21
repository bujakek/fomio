-- Two slug-keyed reads for the guest pages, so a QR scan costs one round trip
-- instead of three.
--
-- The guest path was the slowest thing in the product and the only one that
-- was not optimised. `/e/[slug]` awaited event_by_slug(), then event_photos(),
-- then event_upload_quota() — strictly in that order, because each needed the
-- id the previous one returned. Three serial trips to Postgres before a byte
-- of HTML moved, on a page a guest reaches by pointing a phone at a printed
-- card in a dark room.
--
-- Worse, the second of those pulled *every photo row in the album* — paths,
-- names, dimensions, timestamps — to render two integers in the stats pill.
-- A six-hundred-photo wedding paid for the whole table to be serialised over
-- the wire so a guest could be told "600 kép".
--
-- Both functions here are `security definer` for the same reason every other
-- guest read is: `anon` has no read policy on either table, precisely so that
-- nobody can list every album. You must already know the slug.

-- ---------------------------------------------------------------------------
-- The event page
-- ---------------------------------------------------------------------------
--
-- event_by_slug() plus the two counts, aggregated in Postgres. Deliberately
-- carries no billing columns: event_upload_quota() lives behind a migration
-- that is not pushed yet, and `getEventQuotaOrNull` exists to let the guest
-- page render anyway when it is missing. Folding the quota in here would trade
-- that graceful degradation for a page that 500s on a database without Stripe.
-- The quota stays its own call, and the page is down to two trips rather than
-- one — the right side of that trade.
--
-- The counts are zeroed while the gallery is closed, mirroring event_photos(),
-- which returns nothing in the same state. A host holding photos back for a
-- reveal would not thank us for printing the total on the landing screen.

create function public.event_page_by_slug(p_slug text)
returns table (
  id                     uuid,
  slug                   text,
  event_name             text,
  event_date             date,
  uploads_close_at       timestamptz,
  gallery_private        boolean,
  created_at             timestamptz,
  photo_count            integer,
  contributor_count      integer,
  has_named_contributors boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    e.id,
    e.slug,
    e.event_name,
    e.event_date,
    e.uploads_close_at,
    (e.gallery_hidden_at is not null) as gallery_private,
    e.created_at,
    coalesce(c.photo_count, 0)::integer as photo_count,
    -- A floor, not a headcount, exactly as summarisePhotos() had it: guests
    -- who skip the name field are indistinguishable from one another, so every
    -- anonymous upload collapses into a single bucket. Undercounting is the
    -- right direction to be wrong in — it never inflates participation, which
    -- is the one number this pilot exists to measure.
    (coalesce(c.named_count, 0)
      + case when coalesce(c.has_anonymous, false) then 1 else 0 end)::integer
      as contributor_count,
    coalesce(c.named_count, 0) > 0 as has_named_contributors
  from public.events e
  left join lateral (
    select
      count(*) as photo_count,
      -- count(distinct) drops nulls, which is what makes this the count of
      -- *named* contributors. lower() rather than the JS toLocaleLowerCase('hu')
      -- it replaces: the database collation handles the accented characters
      -- that matter here, and the two agree on every name a guest can type.
      count(distinct lower(nullif(btrim(p.uploader_name), ''))) as named_count,
      bool_or(nullif(btrim(p.uploader_name), '') is null) as has_anonymous
    from public.photos p
    where p.event_id = e.id
      and p.hidden_at is null
  ) c on e.gallery_hidden_at is null
  where e.slug = p_slug
$$;

comment on function public.event_page_by_slug(text) is
  'Guest event page in one round trip: the event row plus the visible photo and contributor counts. Counts are zero while the gallery is hidden.';

-- ---------------------------------------------------------------------------
-- The gallery
-- ---------------------------------------------------------------------------
--
-- event_photos() keyed on the slug instead of the id. The id was the whole
-- reason the gallery needed two serial trips — it had to resolve the event
-- before it could ask for the photos. Keying both reads on the slug lets the
-- layout and the page fetch concurrently.
--
-- Column list matches event_photos() exactly so both share one TypeScript
-- type. Same two visibility rules, and they stay here rather than in the
-- caller so the guest gallery cannot drift from anything else that lists
-- photos.

create function public.event_gallery_by_slug(p_slug text)
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
  where e.slug = p_slug
    and p.hidden_at is null
    and e.gallery_hidden_at is null
  order by p.created_at desc
$$;

comment on function public.event_gallery_by_slug(text) is
  'Visible photos for one event, keyed on slug so the gallery does not have to resolve the event id first. Same visibility rules as event_photos().';

-- Both are reachable by anyone holding the link, which is the access model.
-- `public` is revoked first so the grant is the whole story.
revoke all on function public.event_page_by_slug(text) from public;
revoke all on function public.event_gallery_by_slug(text) from public;
grant execute on function public.event_page_by_slug(text) to anon, authenticated;
grant execute on function public.event_gallery_by_slug(text) to anon, authenticated;
