# Fomio MVP backlog

Ordered build plan for the pilot. Derived from the build order and MVP scope in
`CLAUDE.md`; the technical detail for each area lives in `.cursor/skills/`.

- **Goal of the pilot:** answer one question — do guests actually use the QR to
  upload? Anything that does not serve that question is out of scope.
- **Status:** planning. Nothing in Phase 1+ is implemented yet.
- **Last updated:** 2026-08-13

Work the phases in order. Within a phase, respect the stated dependencies;
otherwise order is flexible.

---

## Decisions needed first

These block or invalidate downstream work. Settle them before Phase 1.

- [ ] **D1 — Slug format.** `slugify("Anna & Péter")` returns `anna-peter`.
      Privacy rests entirely on the URL being unguessable, and that one is
      trivially guessable. Recommend a short random suffix (`anna-peter-k3f9`).
      _Blocks 5.4. Once a QR is printed the slug is physically fixed._
- [ ] **D2 — Supabase project and region.** Does one exist? Choose an EU region:
      Hungarian event, photos of identifiable people.
      _Blocks all of Phase 1._
- [ ] **D3 — Host auth scope.** The RLS in `fomio-supabase` grants _any_ signed-in
      user full host rights. Acceptable only if public signups are disabled.
      Decide: single host, or an email allowlist inside the policy.
      _Changes the policy you write in 1.5; not a retrofit._
- [ ] **D4 — Permanent delete.** The FAQ promises it twice ("a házigazda bármikor
      véglegesen törölheti"), but it is absent from MVP scope and from the
      landing-page promises list in `CLAUDE.md`. Either build it (5.8) or change
      the Hungarian copy.
      _It is a live claim on a public page._

---

## Phase 1 — Supabase foundation

- [ ] **1.1 Provision project, pull env.** Wire the Vercel↔Supabase integration,
      run `vercel env pull .env.local`, confirm all three keys arrive. Never
      hand-edit or commit `.env.local`.
      _Depends on: D2_
- [ ] **1.2 Install SDK.** `@supabase/supabase-js` + `@supabase/ssr`. No client
      code in this ticket.
      _Depends on: 1.1_
- [ ] **1.3 CLI and migration workflow.** `supabase init`, `supabase link`, commit
      the `supabase/` directory. Migrations are append-only SQL files in the
      repo — never change schema from the dashboard.
      _Depends on: 1.1_
- [ ] **1.4 Schema migration.** `events` + `photos` + the partial index on
      `(event_id, created_at desc) where hidden_at is null`. RLS **enabled** in
      the same migration, no policies yet, so the tables start locked.
      _Depends on: 1.3_
- [ ] **1.5 RLS policies migration.** Anon read events; anon read visible photos;
      anon insert while the upload window is open (enforced in the policy, not
      the UI); host manages everything.
      _Depends on: 1.4, D3_
- [ ] **1.6 Storage migration.** `event-photos` bucket — public, 15 MB limit,
      `image/jpeg` only — plus object policies. Path layout
      `event-photos/{event_id}/{photo_id}.jpg`.
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
- [ ] **3.3 Picker and state machine.** Per-file status:
      `várakozik → előkészítés → feltöltés → kész | hiba`.
      _Depends on: 2.2_
- [ ] **3.4 Upload and insert.** Direct browser→Storage, then the `photos` row —
      in that order. Client-generated UUID so path and row agree.
      _Depends on: 3.2, 3.3, 1.6_
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
      reserving space to avoid layout shift. Supabase tiles are already
      compressed to spec, so mark those `<Image>` tags `unoptimized`.
      _Depends on: 1.9_
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
- [ ] **5.4 Create event.** Name, date, upload window, slug generation and
      collision handling. Must use the canonical `lib/slug.ts`.
      _Depends on: 5.3, D1_
- [ ] **5.5 QR and printable card.** Generated from the final event URL. Include a
      print stylesheet and check the physical scan size.
      _Depends on: 5.4_
- [ ] **5.6 Moderation.** Hide/unhide via `hidden_at` (never hard-delete a photo),
      revalidate the gallery afterwards.
      _Depends on: 5.3_
- [ ] **5.7 ZIP export.** Route handler using the service-role key. Server-only
      file, re-check the session before streaming, stream rather than buffer the
      whole album.
      _Depends on: 5.3_
- [ ] **5.8 Permanent event delete.** Cascade the rows and purge the storage
      objects.
      _Depends on: 5.3, D4 — only if D4 says build it._

---

## Phase 6 — Pre-pilot

- [ ] **6.1 Funnel instrumentation.** Scan → page view → picker opened → upload
      started → upload completed. Nothing currently measures the one question
      the pilot exists to answer; without this the experiment produces no result.
- [ ] **6.2 Verify signups are disabled.** Confirm in the Supabase dashboard, then
      prove a second account cannot reach `/admin`.
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
      of identifiable people.
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
