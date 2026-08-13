---
name: fomio-supabase
description: Fomio's Supabase conventions — browser and server client setup with @supabase/ssr, SQL migrations via the Supabase CLI, the events and photos schema, RLS policies for anonymous guest uploads, storage bucket configuration, and Supabase Auth magic-link protection for the admin area. Use when touching the database, writing migrations, configuring RLS or storage, generating types, or wiring auth in Fomio.
---

# Fomio Supabase

Postgres + Storage + Auth. Guests are **anonymous** (never signed in); only the host signs in, via magic link, to reach `/admin`.

## Install (build step 1, not done yet)

```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

Env keys are maintained **by hand** in `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and server-only `SUPABASE_SERVICE_ROLE_KEY`. `vercel env pull` does not work on this project — the integration's variables are marked Sensitive and pull back as `[SENSITIVE]`; see the Local env section of `CLAUDE.md`. The service role key must **never** be imported into a Client Component or any file reachable from one.

Mind the prefix: the integration also provisions bare `SUPABASE_URL` and `SUPABASE_ANON_KEY`. Next.js only exposes variables to the browser when they start with `NEXT_PUBLIC_`, so the browser client reads `undefined` if you wire it to the bare names.

## Migrations — always SQL files in the repo

Never change schema by clicking in the dashboard; the repo is the source of truth.

```bash
supabase init                                   # once
supabase link --project-ref <ref>               # once
supabase migration new create_events_and_photos # creates supabase/migrations/<ts>_*.sql
supabase db push                                # apply to the linked project
supabase gen types typescript --linked > lib/supabase/database.types.ts
```

Migrations are append-only: to change something, write a new migration. Every table gets RLS enabled in the same migration that creates it.

## Schema

```sql
create table public.events (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  event_name       text not null,
  event_date       date,
  uploads_close_at timestamptz,  -- null = open forever; gallery stays readable after
  owner_id         uuid not null references auth.users (id) on delete restrict,
  created_at       timestamptz not null default now()
);

create index events_owner_idx on public.events (owner_id);

create table public.photos (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events (id) on delete cascade,
  storage_path  text not null unique,
  thumb_path    text not null,  -- ~400px tile; the gallery must never load storage_path
  uploader_name text,          -- optional guest nickname, kept on their device
  hidden_at     timestamptz,   -- soft delete for moderation; never hard-delete
  width         integer,
  height        integer,
  byte_size     integer,
  mime_type     text,
  created_at    timestamptz not null default now()
);

create index photos_event_created_idx
  on public.photos (event_id, created_at desc)
  where hidden_at is null;
```

`width`/`height` are required by the gallery to reserve grid space and avoid layout shift — always write them (the upload pipeline knows them post-compression).

## RLS

```sql
alter table public.events enable row level security;
alter table public.photos enable row level security;

create policy "anyone with the link can read events"
  on public.events for select to anon, authenticated
  using (true);

create policy "host manages own events"
  on public.events for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "anyone can read visible photos"
  on public.photos for select to anon, authenticated
  using (hidden_at is null);

create policy "guests can add photos while uploads are open"
  on public.photos for insert to anon
  with check (
    hidden_at is null
    and exists (
      select 1 from public.events e
      where e.id = photos.event_id
        and (e.uploads_close_at is null or e.uploads_close_at > now())
    )
  );

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
```

Why it's shaped this way:

- Guests get **insert only**. No update, no delete — a guest can't edit or remove someone else's photo, and can't un-hide a moderated one (`hidden_at is null` is enforced in `with check`).
- The `exists (...)` clause makes the upload window a database rule, not a UI suggestion.
- Host policies key off **`owner_id`, never a bare `to authenticated`**. A blanket `using (true)` would make every signed-in user a host of every event — able to read hidden photos, export albums and delete them. With ownership scoping, a stray signup lands in an empty admin instead. Disabling public signups is still worth doing, but it is now defence in depth rather than the only thing standing between a stranger and someone's wedding.
- Ownership scoping is **not** the multi-tenant dashboard that `CLAUDE.md` rules out. There is no per-client branding, no tenant switching, no sharing — just a row knowing who created it.
- `owner_id` is `not null`, so a user must exist before any event can be inserted. Create your own account in the dashboard before seeding development data.

## Storage

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-photos', 'event-photos', true, 15728640, array['image/jpeg'])
on conflict (id) do nothing;

create policy "public read event photos"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'event-photos');

create policy "guests upload into an open event folder"
  on storage.objects for insert to anon
  with check (
    bucket_id = 'event-photos'
    and (storage.foldername(name))[1] in (
      select e.id::text from public.events e
      where e.uploads_close_at is null or e.uploads_close_at > now()
    )
  );

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
```

- Path layout: `event-photos/{event_id}/{photo_id}.jpg`, with the tile alongside it at `{photo_id}_thumb.jpg`. The first path segment is always the event id — every policy above depends on that, so never flatten the layout.
- Compare the folder segment as **text** (`e.id::text`), not by casting the segment to `uuid`. A malformed path would make the cast raise rather than simply fail the check.
- Guest inserts are scoped to a folder belonging to a real event with an open upload window. A blanket `with check (bucket_id = 'event-photos')` would let anyone write arbitrary objects into any folder they invented.
- Only `image/jpeg` is allowed because the client always converts and compresses to JPEG first (see `fomio-upload`). HEIC never reaches the bucket.
- Public bucket = privacy comes from unguessable event slugs, not from storage ACLs. Slugs carry a random suffix (`lib/slug.ts`, `generateEventSlug()`); add `noindex` to event routes.
- Guests can insert but never update or delete an object, so nobody can overwrite someone else's photo by guessing its path.

## Clients

Two files, two purposes. Never import the server client from a Client Component.

`lib/supabase/client.ts` — browser (guest uploads, gallery interactivity):

```ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
```

`lib/supabase/server.ts` — Server Components, Route Handlers, Server Actions. `cookies()` is **async** in Next.js 16:

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './database.types'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Called from a Server Component render; middleware refreshes it.
          }
        },
      },
    },
  )
}
```

## Data access

Keep queries in `lib/` modules (`lib/events.ts`, `lib/photos.ts`), not inline in components, so admin and guest pages share one definition of "visible photo".

```ts
export async function getEventBySlug(slug: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('events')
    .select('id, slug, event_name, event_date, uploads_close_at')
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw error
  return data // null → caller calls notFound()
}
```

Use `.maybeSingle()` for slug lookups (`.single()` throws on miss). Always check `error` — Supabase does not reject the promise on query failure.

## Caching

The gallery must show photos uploaded seconds ago, so it cannot be statically cached. Read fresh on the gallery and event routes (`export const dynamic = 'force-dynamic'`, or `revalidate = 0`), and revalidate after admin mutations. There is no Realtime subscription in scope — guests see new photos on refresh.

## Admin auth

Magic link, guarded by middleware:

```ts
// middleware.ts — refresh the session and gate /admin
export const config = { matcher: ['/admin/:path*'] }
```

In middleware, create a server client bound to the request/response cookies, call `supabase.auth.getUser()`, and redirect to the login route when there's no user. Use `getUser()` for authorization decisions — never trust `getSession()` on the server, since it reads unverified cookie data.

The ZIP export is the one place that legitimately needs `SUPABASE_SERVICE_ROLE_KEY`: a Route Handler that streams every object for an event, including hidden ones if the host asks. Keep it in a server-only file and re-check the user's session before streaming.
