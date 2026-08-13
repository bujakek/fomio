# Fomio MVP backlog

Ordered build plan for the pilot. Derived from the build order and MVP scope in
`CLAUDE.md`; the technical detail for each area lives in `.cursor/skills/`.

- **Goal of the pilot:** answer one question — do guests actually use the QR to
  upload? Anything that does not serve that question is out of scope.
- **Status:** D1–D4 settled and **Phase 1 complete**, all verified against the
  live database. Run `pnpm seed` for a working event to develop against. Next
  is Phase 2 (`/e/[slug]`), which is the first guest-facing UI.
- **Last updated:** 2026-08-13

Work the phases in order. Within a phase, respect the stated dependencies;
otherwise order is flexible.

---

## Decisions — settled 2026-08-13

Do not reopen these without a reason; the tickets below already assume them.

- [x] **D1 — Slug format → readable stem plus a random suffix.**
      `anna-peter-k3f9x7`. Guests have no gate of any kind, so the URL is the
      only lock on the album, and `anna-peter` is enumerable in minutes from a
      list of common Hungarian first names. Six characters from a 30-character
      alphabet (no `0`/`o`, `1`/`l`/`i`, or `u`) gives ~729 million
      combinations. **Implemented** in `lib/slug.ts`: `slugify()` stays
      deterministic because the landing page calls it on every keystroke;
      `generateEventSlug()` is what real events get.
- [x] **D2 — Supabase free during development, Pro before the wedding.**
      Region is Zurich (`eu-central-2`), provisioned via the Vercel integration.
      Latency from Hungary is indistinguishable from Frankfurt. Note that
      Switzerland is outside the EU/EEA, so this is a third-country transfer —
      lawful under the Commission's adequacy decision for Switzerland, no SCCs
      required, but the privacy policy (6.5) must say where photos are stored.
      Free tier is 1 GB storage / 5 GB egress, and a
      well-attended wedding produces 1.2–2.4 GB, so **the free tier only
      survives if the pilot fails.** The upgrade is a blocking launch gate
      (6.0), not a nice-to-have. Expect the project to pause after any 7-day
      development gap.
- [x] **D3 — Ownership scoping via `events.owner_id`.** Host RLS keys off
      `owner_id = auth.uid()` rather than a blanket `to authenticated`, so a
      stray signup reaches an empty admin instead of owning every event.
      Touches the events, photos and storage policies plus the ZIP export.
      This is ownership scoping, **not** the multi-tenant dashboard that
      `CLAUDE.md` rules out.
- [x] **D4 — Build self-serve permanent delete (5.8).** The FAQ promises it
      twice on a live page, and GDPR erasure applies regardless. Roughly
      30 lines once admin exists: cascade the rows, purge the storage prefix.

---

## Phase 1 — Supabase foundation

- [x] **1.1 Provision project, wire local env.** Done. Project provisioned via
      the Vercel↔Supabase integration (Zurich). `vercel env pull` turned out to
      be a dead end — every variable is marked Sensitive and pulls back as
      `[SENSITIVE]` — so `.env.local` is maintained by hand from the Supabase
      dashboard. Watch the `NEXT_PUBLIC_` prefix: the integration also ships
      bare `SUPABASE_URL`/`SUPABASE_ANON_KEY`, which the browser cannot read.
      _Depends on: D2_
- [x] **1.2 Install SDK.** Done. `@supabase/supabase-js` 2.112.3 and
      `@supabase/ssr` 0.12.4.
      _Depends on: 1.1_
- [x] **1.3 CLI and migration workflow.** Done. The CLI is a **devDependency**
      (`supabase` 2.114.0), not a global or brew install, so the version is
      pinned in the lockfile — invoke it as `pnpm supabase …`. `init` and `link`
      are complete against `supabase-fomio` (`eu-central-2`, Postgres 17.6) and
      `pnpm supabase migration list` reaches the remote and returns empty.
      Migrations are append-only SQL files in the repo — never change schema
      from the dashboard.
      _Depends on: 1.1_
- [x] **1.4 Schema migration.** Done —
      `supabase/migrations/20260813130659_create_events_and_photos.sql`, applied
      to the remote. `events` (with `owner_id` → `auth.users`, `not null`,
      `on delete restrict`) + `photos` (with `thumb_path not null`), the partial
      index on `(event_id, created_at desc) where hidden_at is null`, and
      `events_owner_idx`. RLS enabled with **no** policies, so both tables are
      locked until 1.5. Verified against the live database: every column
      asserted by name through PostgREST, all six indexes present, anon `select`
      returns `[]` and anon `insert` is refused with `42501` on both tables.
      _Depends on: 1.3_
- [x] **1.5 RLS policies migration.** Done — `20260813133341_rls_policies.sql`
      plus `20260813134313_event_gallery_privacy.sql`, both applied.
      **Guests get no read policy on either table.** The originally documented
      `using (true)` would have exposed `GET /rest/v1/events?select=slug` — every
      album in the system — making the D1 slug suffix pointless. Reads go
      through `security definer` RPCs keyed on slug or event id
      (`event_by_slug`, `event_photos`), so there is nothing to enumerate.
      `event_accepts_uploads()` must also be `security definer`: policy
      expressions run as the invoking role, so an inline `exists` against
      `events` would be filtered by its RLS and silently fail every upload.
      Host policies scope to `owner_id = auth.uid()`.
      Verified by `supabase/tests/rls.py` — 19 checks, all passing.
      _Depends on: 1.4_
- [x] **1.5b Private gallery toggle (schema + policy).** Done. `gallery_hidden_at`
      on `events`: guests keep uploading, `event_photos()` returns nothing, and
      `event_by_slug()` surfaces `gallery_private` so the UI can explain the
      state rather than show an empty album. Reversible at any time. Admin UI
      for it is 5.6b.
      _Depends on: 1.5_
- [x] **1.6 Storage migration.** Done — `20260813135648_storage_bucket.sql`,
      applied. `event-photos` bucket: public, 15 MB limit, `image/jpeg` only.
      **No select policy for anon** — a public bucket serves downloads without
      consulting RLS, so a select policy would add nothing for viewing while
      enabling `object/list`, which walks every event id and photo id in the
      project. Guest insert is scoped by `event_folder_accepts_uploads()`
      (`security definer`, same RLS trap as 1.5); host access is scoped by
      ownership. Folder segments compared as text, never cast to `uuid`.
      Verified by `supabase/tests/storage.py` — 16 checks, including the host
      paths exercised with a **real signed-in JWT** rather than `service_role`,
      which bypasses RLS and would have proven nothing.
      _Depends on: 1.4_
- [x] **1.7 Client modules.** Done. `lib/supabase/client.ts` (browser) and
      `lib/supabase/server.ts` (async `cookies()`, Next 16), both typed with the
      generated `Database`. `server.ts` imports `server-only`, so reaching it
      from a Client Component is a build error rather than a silent leak. Both
      use the anon key and carry the caller's session, so RLS still applies —
      the service role key stays confined to the ZIP export (5.7). Credentials
      go through `lib/supabase/env.ts`, which fails with a message naming the
      `NEXT_PUBLIC_` prefix trap instead of an opaque `Invalid URL` from inside
      the SDK.
      _Depends on: 1.2_
- [x] **1.8 Generated types.** Done. `lib/supabase/database.types.ts` generated
      from the live schema, plus `pnpm types:gen` and `pnpm types:check`.
      Verified as actually enforced, not merely present: a bogus column and a
      bogus RPC argument both fail `tsc`, and `types:check` was confirmed to
      exit 1 on a deliberately stale file.
      **Deviation from the original ticket:** this is _not_ wired into
      `pnpm verify`. `verify` runs after every edit and must stay fast and
      offline; a live-database call would make it need CLI auth and a network
      round trip, and break for anyone not logged into the Supabase CLI. The
      real protection is that generated types make a wrong column a compile
      error. Run `pnpm types:gen` after every `db push`; `types:check` is the
      deliberate drift check, and belongs in CI if that ever exists.
      _Depends on: 1.4_
- [x] **1.9 Data access layer.** Done. `lib/events.ts` (`getEventBySlug`,
      `uploadsAreOpen`) and `lib/photos.ts` (`getEventPhotos`), both
      `server-only` and both going through the RPCs rather than `.from()`.
      Row types are _derived_ from the generated function signatures
      (`Database['public']['Functions'][…]['Returns'][number]`), so adding a
      column to an RPC without updating callers is a compile error rather than
      a silent `undefined` — verified with a negative control.
      `lib/storage.ts` is separate and isomorphic: it holds `photoStoragePaths`
      (the single definition of the path layout every storage policy depends
      on) and `photoPublicUrl`, and imports no client, so Client Components in
      Phase 3 can use it without dragging in `server-only`.
      _Depends on: 1.7, 1.8_
- [x] **1.10 Dev seed event.** Done — `pnpm seed` (`scripts/seed.ts`).
      Host user `olivia@apexlab.io` created via the admin API, email confirmed,
      no password: magic-link only, matching 5.1. Seeds one event with six
      photos put through the same shape as the Phase 3 browser pipeline —
      4096px bound at q92 plus a ~400px thumb — because tiny placeholders would
      make the gallery look fine while hiding the layout and payload problems
      worth catching. Idempotent: a re-run reuses the event and skips uploads.
      Verified end to end as `anon`: `event_by_slug` returns the event without
      leaking `owner_id`, `event_photos` returns six rows with dimensions, and
      both thumb (37KB) and full (233KB) fetch over the public URL.
      _Depends on: 1.9_

---

## Phase 2 — Guest event page

- [ ] **2.1 Route scaffolding.** `/e/[slug]` and its layout, `noindex` on every
      event route, `notFound()` on an unknown slug, `force-dynamic` so a photo
      uploaded seconds ago is visible.
      _Depends on: 1.9_
- [ ] **2.2 Event page UI.** Name, date, prominent upload CTA, gallery link.
      Mobile-first — design and test at 390px first.
      _Depends on: 2.1_
- [ ] **2.3 Closed-upload state.** Once the window has passed the gallery stays
      viewable and the upload CTA disappears.
      _Depends on: 2.2_

---

## Phase 3 — Upload

- [ ] **3.1 HEIC handling.** `lib/image.ts` with extension-and-MIME detection and
      a dynamic `heic-to` import, so guests on JPEG phones never pay for the
      decoder.
- [ ] **3.2 Compression.** 4096px bounding box, quality 0.92, EXIF orientation
      baked into the pixels, never upscale, process files sequentially.
      _Depends on: 3.1_
- [ ] **3.2b Thumbnail generation.** A second ~400px JPEG per photo, produced
      from the bitmap already decoded in 3.2 so it costs almost nothing. The
      gallery grid depends on this — see 4.1.
      _Depends on: 3.2_
- [ ] **3.3 Picker and state machine.** Per-file status:
      `várakozik → előkészítés → feltöltés → kész | hiba`.
      _Depends on: 2.2_
- [ ] **3.4 Upload and insert.** Both objects (full + thumb) direct
      browser→Storage, then the `photos` row — in that order, so a failed insert
      leaves harmless orphans rather than a broken tile. Client-generated UUID
      so paths and row agree.
      _Depends on: 3.2b, 3.3, 1.6_
- [ ] **3.5 Retry and cleanup.** Manual per-file retry, revoke every object URL,
      guard against navigating away mid-upload.
      _Depends on: 3.4_
- [ ] **3.6 Optional nickname.** Remembered in `localStorage` so a guest types it
      once per device.
      _Depends on: 3.4_
- [ ] **3.7 Success state.** Unmistakable and celebratory — this is the exact
      moment the pilot is measuring.
      _Depends on: 3.4_

---

## Phase 4 — Gallery

- [ ] **4.1 Grid.** Responsive, hidden photos excluded, stored `width`/`height`
      reserving space to avoid layout shift. **Serve `thumb_path`, never
      `storage_path`** — a 4096px/~2MB file is the right thing to download and
      print and completely the wrong thing to tile at 200px; one guest scrolling
      a 600-photo album would otherwise pull over a gigabyte, which also breaks
      the free-tier egress cap. Full resolution belongs in the lightbox and the
      ZIP only. Mark the tiles `unoptimized` — they are already the right size,
      so Vercel's optimizer would add cost and latency for nothing.
      _Depends on: 1.9, 3.2b_
- [ ] **4.2 Lightbox.** Swipe, keyboard navigation, focus trap, escape to close.
      _Depends on: 4.1_
- [ ] **4.3 Empty state.** The first guest to arrive sees zero photos.
      _Depends on: 4.1_

---

## Phase 5 — Admin

- [ ] **5.1 Magic-link login.** Supabase Auth, host only.
      _Depends on: 1.7_
- [ ] **5.2 Auth gate in `proxy.ts`.** Next 16 renamed middleware: the file is
      `proxy.ts`, the export is `proxy()`, the config is `proxyConfig`. A
      `middleware.ts` is **silently ignored** in Next 16 — no warning, no error,
      `/admin` simply unguarded while looking protected. `matcher:
['/admin/:path*']`, session refresh, and `getUser()` for the
      authorization decision, never `getSession()` on the server. Verify by
      requesting `/admin` signed out.
      _Depends on: 5.1_
- [ ] **5.3 Admin shell.** Layout plus event list.
      _Depends on: 5.2_
- [ ] **5.4 Create event.** Name, date, upload window. Slug comes from
      `generateEventSlug()` — never a bare `slugify()` — plus retry on the
      unique-constraint collision. Sets `owner_id = auth.uid()`.
      _Depends on: 5.3_
- [ ] **5.5 QR and printable card.** Generated from the final event URL. Include a
      print stylesheet and check the physical scan size.
      _Depends on: 5.4_
- [ ] **5.6 Moderation.** Hide/unhide via `hidden_at` (never hard-delete a photo),
      revalidate the gallery afterwards. Note the limit: hiding drops a photo
      from the gallery, but the object stays fetchable at its public URL by
      anyone who already has it, and public objects are CDN-cached. Adequate for
      moderation; say so plainly if someone asks for real removal, which is 5.8.
      _Depends on: 5.3_
- [ ] **5.6b Private gallery toggle (UI).** Switch the event between public and
      private by setting or clearing `gallery_hidden_at`; the database side is
      already done (1.5b). Make the current state obvious in admin, and make
      clear that guests can still upload while it is closed. The guest event
      page also needs to read `gallery_private` and say why the gallery is
      unavailable instead of rendering an empty grid.
      _Depends on: 5.3, 1.5b_
- [ ] **5.7 ZIP export.** Route handler using the service-role key. Server-only
      file; stream rather than buffer the whole album. The service key bypasses
      RLS, so ownership must be checked in code — confirm `owner_id` matches the
      session user before streaming a single byte. Export full resolution, not
      thumbs.
      _Depends on: 5.3_
- [ ] **5.8 Permanent event delete.** Cascade the rows and purge the storage
      objects. Expect CDN lag — a removed public object keeps answering from the
      edge for a while, so don't verify deletion by re-fetching the public URL
      (list the folder instead).
      _Depends on: 5.3, D4 — only if D4 says build it._

---

## Phase 6 — Pre-pilot

- [ ] **6.1 Funnel instrumentation.** Scan → page view → picker opened → upload
      started → upload completed. Nothing currently measures the one question
      the pilot exists to answer; without this the experiment produces no result.
- [ ] **6.0 Upgrade to Pro — blocking launch gate.** Free tier is 1 GB storage /
      5 GB egress; a well-attended wedding produces 1.2–2.4 GB and the ZIP
      export alone can exceed the egress cap. Hitting either limit mid-reception
      cannot be fixed in the moment. Do this before the QR codes go out, not on
      the day.
- [ ] **6.2 Verify ownership scoping holds.** Sign up a throwaway second account
      and confirm it sees an empty admin — no events, no photos, no export, no
      delete. Disabling public signups is still worth doing as defence in depth.
- [ ] **6.3 Landing page truthfulness.** The 3.2M photos / 12,400 events /
      "4,9 / 5 · 2 800+ értékelés" stats and the three named testimonials are
      fabricated, on a live domain, for a product with no users. Decide before
      real traffic — invented review counts are an EU consumer-protection
      exposure, not only a taste question.
- [ ] **6.4 Wire the CTAs.** Every landing CTA is an anchor to `#zaro-cta`; a
      visitor cannot currently become a pilot host. Also drop the leftover
      `generator: 'v0.app'` from `app/layout.tsx`.
- [ ] **6.5 Privacy policy.** No legal pages exist, the FAQ makes explicit
      data-handling claims, and this is an EU consumer product handling photos
      of identifiable people. Must name Switzerland as the storage location
      (see D2) and describe the erasure route built in 5.8.
- [ ] **6.6 Abuse ceiling.** Uploads are anonymous and unlimited. The bucket caps
      file size but not volume. Decide whether a per-event cap is needed.
- [ ] **6.7 Real-device matrix.** iPhone Safari (HEIC path), Android Chrome (JPEG
      path), one multi-select of 10+ photos, one throttled connection.
      Simulators reproduce none of these.
- [ ] **6.8 Print and scan.** Full physical loop with a real printed card.
- [ ] **6.9 Fix `backdrop-filter` prefixing.** The build ships only
      `-webkit-backdrop-filter` for `.glass`, `.glass-strong` and `.glass-nav`,
      so Firefox gets no glass blur anywhere on the site. Pre-existing and
      unrelated to the MVP, but it is a whole-site visual bug.

---

## Out of scope

Flag and ask before starting any of these — they are deliberately excluded:

App Clip or native app · photographer/multi-tenant dashboard · per-client
branding · payments, tokens, revenue share, invoicing · guest accounts or
mandatory registration · delayed reveal · film filters · email notifications ·
multi-language · realtime gallery updates · resumable or background uploads.
