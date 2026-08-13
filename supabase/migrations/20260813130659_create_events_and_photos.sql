-- Core schema for Fomio: one event per QR code, many guest photos per event.
--
-- RLS is enabled here but deliberately left with no policies, so both tables
-- start fully locked: with RLS on and nothing granted, anon and authenticated
-- can read nothing and write nothing. Access is opened deliberately in the
-- following migration. Never enable a table without enabling RLS in the same
-- migration — the window in between is a public database.

create table public.events (
  id               uuid primary key default gen_random_uuid(),
  slug             text        not null unique,
  event_name       text        not null,
  event_date       date,
  -- null = uploads never close. The gallery stays readable either way.
  uploads_close_at timestamptz,
  -- The host. Every RLS host policy keys off this; `restrict` rather than
  -- `cascade` so deleting an account can never silently take a wedding album
  -- with it — the events have to be dealt with explicitly first.
  owner_id         uuid        not null references auth.users (id) on delete restrict,
  created_at       timestamptz not null default now()
);

-- Admin lists events by owner, and every host RLS policy filters on it.
create index events_owner_idx on public.events (owner_id);

create table public.photos (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events (id) on delete cascade,
  -- Full resolution, 4096px/q92 — what the ZIP export and lightbox serve.
  storage_path  text not null unique,
  -- ~400px tile. The gallery grid must load this and never storage_path.
  thumb_path    text not null,
  -- Optional guest nickname, remembered on their device. Guests are anonymous;
  -- this is a label, never an identity.
  uploader_name text,
  -- Soft delete for host moderation. Photos are never hard-deleted here: a
  -- hidden photo still exists for the ZIP export if the host asks for it.
  hidden_at     timestamptz,
  width         integer,
  height        integer,
  byte_size     integer,
  mime_type     text,
  created_at    timestamptz not null default now()
);

-- The gallery's only read pattern: visible photos for one event, newest first.
-- Partial on hidden_at so moderated rows cost nothing to skip.
create index photos_event_created_idx
  on public.photos (event_id, created_at desc)
  where hidden_at is null;

alter table public.events enable row level security;
alter table public.photos enable row level security;
