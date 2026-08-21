# Project: OurFilm — QR-code shared photo album for events

> Product name: **OurFilm**. Domain: `ourfilm.app`. (Earlier working names "Fomio", "Moments" and "Pillanatok" are deprecated — never use them in code or copy.)
>
> Hungarian suffixes attach directly: **az** OurFilm (vowel-initial, so `az` not `a`), OurFilm**mel** (instrumental, assimilating like _filmmel_).

## Read this first

Guests scan a QR code at an event and upload photos from their phone browser — **no app, no account**. The host views and downloads all of them afterward.

**Phase: MVP / pilot for one real wedding.** The single question we're answering: do guests actually use the QR to upload? Nothing else matters yet. There is no validated business model — don't build for scale, don't build for a second customer.

**Language:** UI copy is **Hungarian only** (`lang="hu"`). Not multi-language. Code, comments, commit messages, and this doc stay in English.

**Mobile-first, always.** Guests arrive almost exclusively on phones via QR or a shared link. Design and test at 390px width before anything else.

## Before you say a task is done

```bash
pnpm verify   # typecheck + lint + build. Must pass.
pnpm format   # Prettier; run after writing files
```

Never use npm or yarn — this project is **pnpm**. Never re-add `typescript.ignoreBuildErrors` to `next.config.mjs`; it was removed deliberately so type errors actually fail the build.

## Skills — load these instead of re-deriving conventions

Project skills live in `.cursor/skills/`. Read the relevant one _before_ writing code in that area:

| Skill              | Load when                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| `ourfilm-ui`       | Building or restyling any page or component (glass surfaces, tokens, Hungarian copy conventions) |
| `ourfilm-supabase` | Touching the database, migrations, RLS, storage buckets, or auth                                 |
| `ourfilm-upload`   | Working on the photo upload pipeline (HEIC, compression, direct-to-Storage)                      |

## Tech stack

- **Next.js 16** (App Router, Turbopack), **React 19**, TypeScript strict
- **pnpm**; hosted on **Vercel**
- **Supabase** — Postgres + Storage + Auth, installed and connected (`@supabase/supabase-js`, `@supabase/ssr`). The CLI is a devDependency: `pnpm supabase …`
- **Tailwind CSS v4** — CSS-based config via `@theme` in `app/globals.css`. There is **no `tailwind.config.js`**; don't create one
- **shadcn/ui** (`components.json`, style `base-nova`) on `@base-ui/react`; `lucide-react` icons
- **qrcode.react** for QR generation
- ESLint (flat config, `eslint.config.mjs`) + Prettier (`.prettierrc.json`, no semicolons, single quotes, Tailwind class sorting)

### Local env

`.env.local` is gitignored and **must never be committed**. It is maintained **by hand**. Supabase needs three keys:

```bash
NEXT_PUBLIC_SUPABASE_URL=       # Supabase dashboard → Project Settings → API Keys
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # the anon / public key
SUPABASE_SERVICE_ROLE_KEY=      # service_role; server-only, Stripe webhook
```

Payments add three more, all server-only — Checkout is a redirect to Stripe's
hosted page, so the browser never needs a publishable key:

```bash
STRIPE_SECRET_KEY=              # sk_test_… while piloting
STRIPE_WEBHOOK_SECRET=          # whsec_…, from the endpoint or `stripe listen`
STRIPE_PRICE_EVENT=             # price_… for the one-time per-event purchase
```

**There is no Stripe account yet.** Everything is written and builds without
them; `stripeIsConfigured()` is what keeps the admin UI honest in the meantime,
and filling these in is the whole switch. Provision with
`vercel integration add stripe` once the account exists — it is the Marketplace
provider for `payments` and wires the production variables itself.

**`vercel env pull` does not work on this project — don't reach for it.** The Vercel–Supabase integration created all 16 of its variables as _Sensitive_, which on Vercel means write-only: the value cannot be read back by the CLI, the API or the dashboard, and a pull returns the literal string `[SENSITIVE]` for every one. This is a property of the Sensitive flag, not of the environment scope, so re-scoping them to Development does not help either. Copy the three values from the Supabase dashboard instead.

The integration's other variables are irrelevant here: the `POSTGRES_*` ones are connection strings for direct SQL clients, and `supabase-js` talks over HTTP. It also provisions Supabase's newer `publishable`/`secret` keys alongside the legacy `anon`/`service_role` pair — the code expects the legacy names; migrating is a deliberate choice, not something to drift into.

Deployed builds are unaffected: Vercel injects all of these at build and runtime. This is purely a local-development concern.

## Current state

- **`docs/mvp-backlog.md` is the working plan** — the build order below, broken into ordered tickets with dependencies, plus four decisions that block Phase 1. Check it before starting work, and tick items off as they land.
- **Marketing landing page** — `app/page.tsx` composing `components/site/*` (hero, stats, how-it-works, occasions, testimonials, qr-preview, live-demo, photo-quality, faq, final-cta, footer). Originally v0-generated, now the permanent homepage at `/`.
- `components/site/live-demo.tsx` is a **fake simulation** with hardcoded images, not a real gallery.
- **Phases 1–5 built** (see `docs/mvp-backlog.md`): migrations applied, RLS and storage policies enforced and covered by `supabase/tests/*.py`, typed clients and query modules in `lib/`, the guest event page and gallery, the upload pipeline and queue, and the admin area. `pnpm seed` creates an event to develop against and prints its URL.
- **Guest pages are latency-tuned; the migration is not pushed.**
  `20260821090000_guest_page_round_trips.sql` adds `event_page_by_slug` and
  `event_gallery_by_slug`, and `lib/events.ts` / `lib/photos.ts` already call
  them — so **the guest routes 500 until it is pushed**. `supabase db push`
  applies every pending migration, which means pushing this one also pushes
  roles and Stripe billing below, turning on the 5-photo cap. Those three go
  live together or not at all.
- **Payments and roles are written but not live.** Two migrations —
  `20260820100000_user_roles.sql` and `20260820100100_stripe_billing.sql` — are
  **not yet pushed**, and there is no Stripe account, so `.env.local` has no
  `STRIPE_*` keys. Until both happen the app builds and runs exactly as before:
  every event is uncapped because the cap function does not exist yet, and the
  admin billing card says payment is not switched on. See Billing below.
- `lib/slug.ts` holds the canonical `slugify()` — admin and the QR preview must both use it so printed QR codes never disagree.
- `vercel.json` pins functions to **`fra1`**. Supabase is in `eu-central-2`
  (Zurich) and Vercel's default is `iad1` (Washington DC), so every query on
  the guest path was crossing the Atlantic twice. Frankfurt is the closest
  Vercel region. If the Supabase project ever moves, move this with it —
  nothing else in the code notices, and the symptom is a uniformly slow app.

## The join gate is in the pages, not the layout (settled — learned the hard way)

`guestHasJoined()` (`lib/guest-name-server.ts`) reads a cookie that
`writeGuestName()` mirrors, and **each guest page checks it and returns
`<JoinGate>` before fetching anything**. Do not move this back up into
`app/e/[slug]/layout.tsx`, however much tidier that looks:

- Next renders the child segment and hands the layout the **result**. A layout
  that declines to render `children` still lets the page run — verified: a
  gated gallery served all seven `thumb_path`s and every `uploader_name` in the
  flight payload to a visitor who had typed nothing. Only an early return
  inside the page skips the query.
- The old localStorage check could only run after hydration, so every guest who
  had already joined saw the gate flash on every navigation.

Joining costs one `router.refresh()`. That is the deliberate trade for the two
fixes above: it happens once per device, at the moment a guest expects a submit.
The gate is still **UX, not access control** — a cookie is forged as easily as
it is read, and privacy still rests on the unguessable slug.

## Optimistic updates (settled)

Three places show the result before the server has confirmed it. All three
revert on their own — none of them carries hand-written rollback code.

- **`components/admin/moderation-grid.tsx`** — `useOptimistic` is held on the
  **grid**, not the tile, so the "N rejtve" counter moves with the photo it
  describes. Per-tile state would flip the tile instantly and leave the count a
  round trip behind, which reads as a bug. Measured: tile, label and counter
  all update 74ms after the tap, and a failed action reverts all three and
  shows "Nem sikerült".
- **`components/admin/gallery-toggle.tsx`** — same reasoning, one boolean. A
  switch that sits still for a round trip is one a host taps twice.
- **`lib/recent-uploads.ts` + `app/e/[slug]/gallery/loading.tsx`** — the
  gallery's loading state draws the guest's own just-uploaded photos from the
  `blob:` URLs still in memory. Measured cold: their photo is on screen 377ms
  after the tap and holds until the real grid arrives.

Two rules the upload store depends on:

1. **Only committed uploads are recorded.** `rememberUpload` is called after
   the row insert succeeds, so everything shown is genuinely in the album.
   Recording at queue time would flicker — a guest who navigated mid-queue
   would watch photos appear and then vanish when the server answered.
2. **The store owns the object URLs it is handed.** `upload-queue.tsx` marks
   those items `handedOver` and skips them when it revokes previews on unmount,
   or the gallery draws broken tiles. The store caps itself and revokes what it
   evicts.

`loading.tsx` is also what makes the tap navigate at all — Next partially
prefetches a dynamic route only when the route has one.

## Routing (settled — QR codes get printed, so this is expensive to change)

| Route               | Purpose                                                                 |
| ------------------- | ----------------------------------------------------------------------- |
| `/`                 | Marketing homepage. Permanent. Don't repurpose it.                      |
| `/e/[slug]`         | Event page guests land on from the QR code, and where uploading happens |
| `/e/[slug]/gallery` | Shared gallery                                                          |
| `/admin`            | Host/admin area, Supabase Auth magic link                               |

Plus one machine endpoint: `POST /api/stripe/webhook`, which is the only thing
that marks a purchase paid. Under `/api/` rather than the Hungarian namespace
because no human navigates to it and the URL is pasted into Stripe's dashboard.

The `/e/` prefix is what the landing page already advertises in `qr-preview.tsx` and `how-it-works.tsx`, and it keeps the root namespace free for marketing pages.

## Access model (settled)

- **Guests: no gate at all.** Anyone with the link or QR can view the gallery and upload. No passcode, no login, no nickname required. Any friction directly reduces the participation rate we're trying to measure.
- **Host/admin: Supabase Auth magic link.** Only the admin area is protected. Every event has an `owner_id`, and RLS scopes host reads and writes to `owner_id = auth.uid()` — a signed-in user who owns nothing sees nothing. This is ownership scoping, **not** the multi-tenant dashboard ruled out below.
- **Roles: `user` and `admin`.** Every signup gets a `profiles` row with `role = 'user'` (created by a trigger on `auth.users`), which changes nothing — ownership scoping above is still what governs them. `admin` is the operator: `public.is_admin()` is OR'd into every host policy on `events`, `photos` and the storage bucket, so an admin reads and writes every album, and an admin-owned event is exempt from the upload cap. Nobody can promote themselves — `profiles` has no self-update policy, so the role is writable only by another admin or through the service role. Expect `/admin` to list **every** event once you promote an account.
- Privacy comes from the URL being unguessable and unindexed — add `noindex` to event routes. Slugs therefore carry a random suffix (`anna-peter-k3f9x7`); `slugify()` stays deterministic for the QR preview, and `generateEventSlug()` is what real events get. Never create an event with a bare `slugify()` result.

## Data model (settled)

Details, DDL, and RLS live in `.cursor/skills/ourfilm-supabase/SKILL.md`. Shape:

- **`events`** — `id`, `slug` (unique), `event_name`, `event_date`, `uploads_close_at` (upload window; gallery stays viewable after), `gallery_hidden_at` (set = guests upload but cannot view; host togglable both ways), `owner_id` (→ `auth.users`; the host, and what every RLS host policy keys off), `created_at`

- **`photos`** — `id`, `event_id`, `storage_path`, `thumb_path`, `uploader_name` (nullable — optional guest nickname, remembered on their device), `hidden_at` (soft delete for moderation; never hard-delete), `width`, `height`, `byte_size`, `mime_type` (so the gallery grid reserves space and avoids layout shift), `taken_at` (EXIF capture time, read in the browser **before** the canvas re-encode destroys it; null when the file carried none — always fall back to `created_at`), `created_at`

**Guests never read these tables directly.** The anon key is public, so any table `anon` can `select` is a table anyone can list — a permissive read policy on `events` would hand out every album's slug and make the unguessable URL pointless. Guest reads go through `security definer` functions keyed on the slug or event id (`event_by_slug`, `event_photos`); admin reads the tables directly under ownership policies. Details in the Supabase skill.

- **`profiles`** — `id` (→ `auth.users`), `role` (`user` | `admin`), `created_at`. One row per account, written by a trigger at signup. Read it through `lib/roles.ts`, never inline.

- **`purchases`** — `event_id`, `owner_id`, `stripe_checkout_session_id` (unique), `stripe_payment_intent_id`, `stripe_customer_id`, `amount_minor`, `currency`, `status` (`pending` | `paid` | `refunded`), `created_at`, `paid_at`, `refunded_at`. A ledger, not a flag: abandoned checkouts leave `pending` rows on purpose, which is why `getEventPurchase()` sorts on `paid_at` before `created_at`.

- **`stripe_webhook_events`** — `id` (Stripe's `evt_…`), `type`, `received_at`, `processed_at`. Idempotency plus an audit trail. RLS on with no policies at all: only the service role reaches it.

Storage layout: `event-photos/{event_id}/{photo_id}.jpg` plus `event-photos/{event_id}/{photo_id}_thumb.jpg`.

**The gallery must serve the thumb, never the full image.** A 4096px/~2MB file is the right artifact to download and print, and completely the wrong one to tile at 200px — a single guest scrolling a 600-photo album would pull over a gigabyte. The client already holds the decoded bitmap during upload, so the ~400px thumb is nearly free to produce there.

## Billing (settled)

**One-time purchase per event.** No subscription and no per-guest fee — `/arak`
promises exactly that on a live page.

- **Free:** creating an event, the QR, the gallery, ZIP export, and the first
  **5 photos** (`public.free_photo_limit()`). The pilot measures whether guests
  scan and upload, so nothing in the guest journey sits behind a paywall.
- **Paying unlocks:** the photo cap, for that event, permanently.
- **Enforced in** `event_accepts_uploads()` _and_ `event_folder_accepts_uploads()`
  — both guest write paths. Gating only the `photos` row would let a guest fill
  the bucket with objects no row references. Hiding the upload button is a
  courtesy, not the enforcement.
- **Checkout is a redirect** to Stripe's hosted page (`mode: 'payment'`). No
  card data touches this app, which is the difference between SAQ A and a
  compliance project.
- **Only the webhook marks a purchase paid.** `?checkout=success` proves
  nothing: a host can type it, and a host who closes the tab on Stripe's
  success page still deserves their album.
- **The cap counts hidden photos.** `hidden_at` is moderation, not deletion —
  the object still costs storage, so reclaiming quota by hiding would be a way
  to upload free forever.
- **Admin-owned events are never capped**, which is how the operator runs the
  pilot wedding without charging themselves.
- **Invoicing is still on the never-start list.** A Hungarian company selling
  to consumers must issue an invoice and report it to NAV Online Számla, and
  Stripe does not do that for you. Flag it before the first real forint.

Key files: `lib/stripe/*`, `lib/billing.ts`, `lib/roles.ts`,
`app/api/stripe/webhook/route.ts`, `app/admin/events/[slug]/billing-actions.ts`,
`components/admin/billing-card.tsx`.

## MVP scope

**Building:**

1. Event page `/e/[slug]` — name, date, participation counts, the upload queue itself, link to gallery
2. Upload, inline on the event page — OS picker, client-side HEIC conversion + compression, per-file progress, manual retry
3. Gallery `/e/[slug]/gallery` — responsive grid, lightbox, hidden photos excluded
4. Admin `/admin` — create events, generate/print QR, hide photos, **ZIP download of the whole album**
5. QR code generated from the final event URL

**Not building — flag it and ask first, never start it:**

- App Clip / native app
- Photographer or multi-tenant dashboard, per-client branding
- Token system, revenue share, invoicing (**payments themselves are now
  built** — one-time per event via Stripe Checkout; see Billing below)
- Guest accounts or mandatory registration
- Film filters
- **Automatic** delayed reveal (timed or scheduled unveiling). The host _can_ close the gallery manually at any time via `gallery_hidden_at` — guests keep uploading, they just can't browse — and can reopen it just as easily. That manual toggle is in scope; anything that schedules or automates it is not.
- Email notifications, multi-language
- Realtime gallery updates (Supabase Realtime) — guests refresh; the copy no longer promises live updates
- Resumable/background uploads — manual retry only

## Build order

Ticket-level detail, dependencies, and the open decisions live in `docs/mvp-backlog.md` — work from there; this is the summary.

1. Supabase installed and connected (`@supabase/supabase-js`, `@supabase/ssr`)
2. Migrations for `events` + `photos`, RLS, storage bucket
3. Event page with real data
4. Upload flow → Storage + DB row
5. Gallery
6. Admin: create event, hide photo, ZIP export
7. Real-phone testing, QR printing

## Photo quality policy (settled — the landing page depends on it)

Compress **client-side before upload**, in the browser, straight to Supabase Storage:

- **4096px bounding box, JPEG quality 0.90–0.92.** Below ~85% JPEG drops data exponentially and skin tones go muddy in dim venues; 92% is visually indistinguishable and keeps a 48MP iPhone photo at roughly 1.5–2.2MB instead of 8MB. Print-ready for the couple, fast on congested venue wifi.
- **HEIC must be converted in the browser.** Only Safari can read HEIC; Chrome, Edge, and desktop break on it. Use `heic-to` (lightweight, libheif 1.18) rather than `heic2any` (600KB+ of WASM), and **dynamically import it only when an HEIC file is detected**.

Full pipeline in `.cursor/skills/ourfilm-upload/SKILL.md`.

## Landing page promises we must honor

The marketing page is live, so guests and hosts arrive with expectations. These claims are load-bearing:

- **ZIP download of the whole album** (`benefits.tsx`, `live-demo.tsx`) — must actually work for the pilot
- **High-resolution, print-ready photos** (`photo-quality.tsx` comparison slider, FAQ) — satisfied by the 4096px/92% policy above. The pitch is "chat apps crush your photos, we don't", which stays true; never re-add claims of literally uncompressed originals
- **Private, unindexed album** (`benefits.tsx`, FAQ) — event routes need `noindex`
- **Host can hide unwanted photos** (FAQ) — needs the `hidden_at` flag
- **The free tier's 5-photo cap** (`/arak`) — real and enforced on every guest upload by `public.free_photo_limit()`. `/arak` is the only page that states it; if the limit changes, the migration and that copy move together

If a change would falsify a landing-page claim, either honor it or update the Hungarian copy in the same change.

## Conventions

- `components/site/*` marketing sections · `components/event/*` guest-facing event UI · `components/admin/*` admin UI · `components/ui/*` shadcn primitives
- Files kebab-case; components named exports (`export function EventHeader()`), no default exports except App Router pages/layouts
- Server Components by default; add `'use client'` only for state, refs, or browser APIs
- Shared logic in `lib/` (`lib/slug.ts`, `lib/supabase/*`); never duplicate a helper across components
- Import alias `@/*` from the repo root

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
