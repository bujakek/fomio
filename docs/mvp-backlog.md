# Fomio MVP backlog

Ordered build plan for the pilot. Derived from the build order and MVP scope in
`CLAUDE.md`; the technical detail for each area lives in `.cursor/skills/`.

- **Goal of the pilot:** answer one question — do guests actually use the QR to
  upload? Anything that does not serve that question is out of scope.
- **Status:** planning. D1–D4 settled (2026-08-13); D1 implemented in `lib/slug.ts`. Nothing else built yet.
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
- [ ] **1.4 Schema migration.** `events` (including `owner_id` → `auth.users`,
      `not null`) + `photos` (including `thumb_path`) + the partial index on
      `(event_id, created_at desc) where hidden_at is null` and an index on
      `events.owner_id`. RLS **enabled** in the same migration, no policies yet,
      so the tables start locked.
      _Depends on: 1.3_
- [ ] **1.5 RLS policies migration.** Anon read events; anon read visible photos;
      anon insert while the upload window is open (enforced in the policy, not
      the UI). Host policies scope to `owner_id = auth.uid()` — photos via an
      `exists` join back to `events`. Never a blanket `to authenticated`.
      _Depends on: 1.4_
- [ ] **1.6 Storage migration.** `event-photos` bucket — public, 15 MB limit,
      `image/jpeg` only — plus object policies. Path layout
      `event-photos/{event_id}/{photo_id}.jpg` and `{photo_id}_thumb.jpg`.
      Guest insert is scoped to a folder belonging to a real event with an open
      window; host access is scoped by ownership. Compare the folder segment as
      text, never by casting it to `uuid` — a malformed path would raise rather
      than fail the check.
      _Depends on: 1.4_
- [ ] **1.7 Client modules.** `lib/supabase/client.ts` (browser) and
      `lib/supabase/server.ts` (async `cookies()`, Next 16). The server client
      must never be reachable from a Client Component.
      _Depends on: 1.2_
- [ ] **1.8 Generated types.** `lib/supabase/database.types.ts`, wired into
      `pnpm verify` so schema drift fails the build.
      _Depends on: 1.4_
- [ ] **1.9 Data access layer.** `lib/events.ts`, `lib/photos.ts`. One shared
      definition of "visible photo" for both admin and guest paths. Use
      `.maybeSingle()` for slug lookups and always check `error`.
      _Depends on: 1.7, 1.8_
- [ ] **1.10 Dev seed event.** One event row plus a handful of photos.
      `owner_id` is `not null`, so create your own user in the Supabase
      dashboard first and seed against it — auth (5.1) otherwise becomes an
      accidental prerequisite for all of Phases 2–4.
      _Depends on: 1.9. Unblocks Phases 2–4 without waiting for admin — do this
      early._

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
- [ ] **5.2 Middleware gate.** `matcher: ['/admin/:path*']`, session refresh, and
      `getUser()` for the authorization decision — never `getSession()` on the
      server.
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
      revalidate the gallery afterwards.
      _Depends on: 5.3_
- [ ] **5.7 ZIP export.** Route handler using the service-role key. Server-only
      file; stream rather than buffer the whole album. The service key bypasses
      RLS, so ownership must be checked in code — confirm `owner_id` matches the
      session user before streaming a single byte. Export full resolution, not
      thumbs.
      _Depends on: 5.3_
- [ ] **5.8 Permanent event delete.** Cascade the rows and purge the storage
      objects.
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
