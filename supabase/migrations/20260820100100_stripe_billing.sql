-- Stripe: one-time purchase per event, and the free upload cap it lifts.
--
-- Model, settled with the pricing page (/arak) rather than invented here: an
-- event is free to create, free to share, and free to upload to up to a small
-- cap. Paying once lifts the cap for that event forever. There is no
-- subscription and no per-guest charge — /arak promises exactly that in
-- Hungarian on a live page.
--
-- The cap is enforced here and not in the UI, for the same reason the upload
-- window is: `event_accepts_uploads()` is reachable by anyone with the anon
-- key, so a hidden button is decoration. Both guest write paths are gated —
-- the `photos` row *and* the storage object — because they are two separate
-- policies and gating only the row would let a guest fill the bucket with
-- files no row will ever reference.

-- ---------------------------------------------------------------------------
-- purchases
-- ---------------------------------------------------------------------------

create type public.purchase_status as enum ('pending', 'paid', 'refunded');

create table public.purchases (
  id                         uuid primary key default gen_random_uuid(),
  event_id                   uuid not null references public.events (id) on delete cascade,
  -- Denormalised from events.owner_id so the insert policy can check
  -- ownership without a join, and so a row survives being read after the
  -- event is gone. Kept in sync by nothing: it is written once, at checkout.
  owner_id                   uuid not null references auth.users (id) on delete cascade,
  stripe_checkout_session_id text not null unique,
  stripe_payment_intent_id   text,
  stripe_customer_id         text,
  -- Stripe's own minor units, stored exactly as reported rather than
  -- converted. HUF is one of the currencies Stripe presents as zero-decimal
  -- while still taking amounts in minor units that must divide by 100, so
  -- 9 900 Ft arrives here as 990000. Convert at the edge, in lib/billing.ts,
  -- where a wrong factor is visible in a test rather than baked into a row.
  amount_minor               integer,
  currency                   text,
  status                     public.purchase_status not null default 'pending',
  created_at                 timestamptz not null default now(),
  paid_at                    timestamptz,
  refunded_at                timestamptz
);

create index purchases_event_idx on public.purchases (event_id);
create index purchases_owner_idx on public.purchases (owner_id);

-- Deliberately NOT a partial unique index on (event_id) where status = 'paid'.
-- It reads like a good guard against double entitlement, but it makes the
-- webhook unable to record a second payment that Stripe has already taken —
-- the handler would fail, Stripe would retry for three days, and the money
-- would exist with no row explaining it. Refusing to *start* a second checkout
-- (lib/billing.ts) is the right place for that check; the ledger records what
-- happened.

alter table public.purchases enable row level security;
revoke all on public.purchases from anon;

create policy "host reads own purchases"
  on public.purchases for select to authenticated
  using (owner_id = auth.uid());

-- The host creates the pending row when they start checkout, so a payment that
-- Stripe accepts but never webhooks back still leaves a trace to reconcile
-- against. `status = 'pending'` in the check is what keeps this from being a
-- self-service entitlement grant: there is no update policy at all, so the
-- only way a row reaches 'paid' is the webhook, which runs as the service role
-- and bypasses RLS entirely.
create policy "host records own pending purchase"
  on public.purchases for insert to authenticated
  with check (
    status = 'pending'
    and owner_id = auth.uid()
    and exists (
      select 1 from public.events e
      where e.id = event_id and e.owner_id = auth.uid()
    )
  );

create policy "admins manage purchases"
  on public.purchases for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Webhook idempotency
-- ---------------------------------------------------------------------------

-- Stripe delivers at least once, and retries anything that does not answer 2xx
-- for three days. Every handler below is written to be safely repeatable, but
-- this table turns "safely repeatable" into "not repeated at all" for the
-- common case, and doubles as the log you want when a payment is disputed.
--
-- No policies at all: RLS is on and nothing is granted, so only the service
-- role reaches it. That is exactly the intended audience.
create table public.stripe_webhook_events (
  id           text primary key,
  type         text not null,
  received_at  timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.stripe_webhook_events enable row level security;
revoke all on public.stripe_webhook_events from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Entitlement
-- ---------------------------------------------------------------------------

-- The free tier, in one place. Both gate functions and the quota RPC read it,
-- so the number cannot drift between what the UI promises and what the
-- database enforces. Raising it is a one-line migration.
create or replace function public.free_photo_limit()
returns integer
language sql
immutable
as $$ select 5 $$;

-- Why an event is not capped: somebody paid for it, or it belongs to an admin.
-- The second clause is what lets the operator run an event — the pilot wedding
-- included — without charging themselves, and it is the billing half of the
-- "admin has unlimited access" rule the role migration set up for reads.
create or replace function public.event_has_unlimited_uploads(p_event_id uuid)
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
      and (
        exists (
          select 1 from public.purchases pu
          where pu.event_id = e.id and pu.status = 'paid'
        )
        or exists (
          select 1 from public.profiles pr
          where pr.id = e.owner_id and pr.role = 'admin'
        )
      )
  )
$$;

-- A count that stops as soon as it has seen enough.
--
-- This runs inside the insert policy, so every guest upload pays for it. An
-- unbounded `count(*)` would make that cost grow with the album — the exact
-- shape of query you do not want on the write path of the one interaction the
-- pilot is measuring. Bounded by the free limit it is an index-only scan of at
-- most a handful of tuples on photos_event_idx, whatever the album weighs.
--
-- Counts hidden photos too. `hidden_at` is moderation, not deletion: the
-- object is still in the bucket and still costs storage, so letting a host
-- reclaim quota by hiding would be a way to upload forever for free.
create or replace function public.event_photo_count_capped(p_event_id uuid, p_cap integer)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from (
    select 1
    from public.photos p
    where p.event_id = p_event_id
    limit p_cap
  ) capped
$$;

create or replace function public.event_within_photo_limit(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.event_has_unlimited_uploads(p_event_id)
      or public.event_photo_count_capped(p_event_id, public.free_photo_limit())
           < public.free_photo_limit()
$$;

-- These three are only ever called from inside other security-definer
-- functions, which execute as the definer and therefore need no grant of their
-- own. Nothing calls them over PostgREST, so nothing is granted.
revoke all on function public.free_photo_limit() from public;
revoke all on function public.event_has_unlimited_uploads(uuid) from public;
revoke all on function public.event_photo_count_capped(uuid, integer) from public;
revoke all on function public.event_within_photo_limit(uuid) from public;

-- ---------------------------------------------------------------------------
-- Quota, for the UI
-- ---------------------------------------------------------------------------

-- What the guest page and the admin page both need to say something true about
-- how much room is left. Guests can call it: they are the ones who hit the cap,
-- and "a feltöltés megtelt" with no number is a worse experience than telling
-- them. It leaks that the host is on the free tier, which is a fair trade for
-- an upload button that explains itself.
--
-- `remaining` is null when the event is unlimited — there is no number to show,
-- and returning the real count would mean the unbounded count this file just
-- went to some trouble to avoid.
create or replace function public.event_upload_quota(p_event_id uuid)
returns table (
  photo_limit integer,
  remaining   integer,
  unlimited   boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.free_photo_limit() as photo_limit,
    case
      when public.event_has_unlimited_uploads(p_event_id) then null
      else greatest(
        public.free_photo_limit()
          - public.event_photo_count_capped(p_event_id, public.free_photo_limit()),
        0
      )
    end as remaining,
    public.event_has_unlimited_uploads(p_event_id) as unlimited
$$;

revoke all on function public.event_upload_quota(uuid) from public;
grant execute on function public.event_upload_quota(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- The gates
-- ---------------------------------------------------------------------------
--
-- Both are the existing function with the cap AND'd on. Neither changes its
-- signature, so the policies that call them are untouched and keep their
-- grants.
--
-- Known and accepted: two guests uploading their last free photo at the same
-- instant can both pass the check and land photo 6. The cap is a soft
-- commercial limit, not a safety property, and the alternative is serialising
-- every guest upload behind a lock on the busiest path in the product.

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
  and public.event_within_photo_limit(p_event_id)
$$;

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
      and public.event_within_photo_limit(e.id)
  )
$$;
