# Project: Fomio — QR-code shared photo album for events

> Product name: **Fomio**. Domain: `fomio.io`. (Earlier working names "Moments" and "Pillanatok" are deprecated — never use them in code or copy.)

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

| Skill            | Load when                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------ |
| `fomio-ui`       | Building or restyling any page or component (glass surfaces, tokens, Hungarian copy conventions) |
| `fomio-supabase` | Touching the database, migrations, RLS, storage buckets, or auth                                 |
| `fomio-upload`   | Working on the photo upload pipeline (HEIC, compression, direct-to-Storage)                      |

## Tech stack

- **Next.js 16** (App Router, Turbopack), **React 19**, TypeScript strict
- **pnpm**; hosted on **Vercel**
- **Supabase** — Postgres + Storage + Auth. **Not installed yet**; adding it is build step 1
- **Tailwind CSS v4** — CSS-based config via `@theme` in `app/globals.css`. There is **no `tailwind.config.js`**; don't create one
- **shadcn/ui** (`components.json`, style `base-nova`) on `@base-ui/react`; `lucide-react` icons
- **qrcode.react** for QR generation
- ESLint (flat config, `eslint.config.mjs`) + Prettier (`.prettierrc.json`, no semicolons, single quotes, Tailwind class sorting)

### Local env

Env vars are managed by the Vercel–Supabase integration. `.env.local` is gitignored and **must never be hand-edited or committed**:

```bash
vercel link && vercel env pull .env.local
```

Expected keys: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and (server-only, admin ZIP export) `SUPABASE_SERVICE_ROLE_KEY`.

## Current state

- **`docs/mvp-backlog.md` is the working plan** — the build order below, broken into ordered tickets with dependencies, plus four decisions that block Phase 1. Check it before starting work, and tick items off as they land.
- **Marketing landing page only** — `app/page.tsx` composing `components/site/*` (hero, stats, how-it-works, occasions, testimonials, qr-preview, live-demo, photo-quality, faq, final-cta, footer). Originally v0-generated, now the permanent homepage at `/`.
- `components/site/live-demo.tsx` is a **fake simulation** with hardcoded images, not a real gallery.
- **Nothing functional exists yet**: no event pages, no Supabase client, no migrations, no admin.
- `lib/slug.ts` holds the canonical `slugify()` — admin and the QR preview must both use it so printed QR codes never disagree.

## Routing (settled — QR codes get printed, so this is expensive to change)

| Route               | Purpose                                            |
| ------------------- | -------------------------------------------------- |
| `/`                 | Marketing homepage. Permanent. Don't repurpose it. |
| `/e/[slug]`         | Event page guests land on from the QR code         |
| `/e/[slug]/upload`  | Upload screen (camera or gallery picker)           |
| `/e/[slug]/gallery` | Shared gallery                                     |
| `/admin`            | Host/admin area, Supabase Auth magic link          |

The `/e/` prefix is what the landing page already advertises in `qr-preview.tsx` and `how-it-works.tsx`, and it keeps the root namespace free for marketing pages.

## Access model (settled)

- **Guests: no gate at all.** Anyone with the link or QR can view the gallery and upload. No passcode, no login, no nickname required. Any friction directly reduces the participation rate we're trying to measure.
- **Host/admin: Supabase Auth magic link.** Only the admin area is protected.
- Privacy comes from the URL being unguessable and unindexed — add `noindex` to event routes.

## Data model (settled)

Details, DDL, and RLS live in `.cursor/skills/fomio-supabase/SKILL.md`. Shape:

- **`events`** — `id`, `slug` (unique), `event_name`, `event_date`, `uploads_close_at` (upload window; gallery stays viewable after), `created_at`
- **`photos`** — `id`, `event_id`, `storage_path`, `uploader_name` (nullable — optional guest nickname, remembered on their device), `hidden_at` (soft delete for moderation; never hard-delete), `width`, `height`, `byte_size`, `mime_type` (so the gallery grid reserves space and avoids layout shift), `created_at`

Storage layout: `event-photos/{event_id}/{photo_id}.jpg`.

## MVP scope

**Building:**

1. Event page `/e/[slug]` — name, date, prominent upload CTA, link to gallery
2. Upload `/e/[slug]/upload` — camera or gallery picker, client-side HEIC conversion + compression, per-file progress, manual retry
3. Gallery `/e/[slug]/gallery` — responsive grid, lightbox, hidden photos excluded
4. Admin `/admin` — create events, generate/print QR, hide photos, **ZIP download of the whole album**
5. QR code generated from the final event URL

**Not building — flag it and ask first, never start it:**

- App Clip / native app
- Photographer or multi-tenant dashboard, per-client branding
- Payments, token system, revenue share, invoicing
- Guest accounts or mandatory registration
- Delayed reveal, film filters
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

Full pipeline in `.cursor/skills/fomio-upload/SKILL.md`.

## Landing page promises we must honor

The marketing page is live, so guests and hosts arrive with expectations. These claims are load-bearing:

- **ZIP download of the whole album** (`benefits.tsx`, `live-demo.tsx`) — must actually work for the pilot
- **High-resolution, print-ready photos** (`photo-quality.tsx` comparison slider, FAQ) — satisfied by the 4096px/92% policy above. The pitch is "chat apps crush your photos, we don't", which stays true; never re-add claims of literally uncompressed originals
- **Private, unindexed album** (`benefits.tsx`, FAQ) — event routes need `noindex`
- **Host can hide unwanted photos** (FAQ) — needs the `hidden_at` flag

If a change would falsify a landing-page claim, either honor it or update the Hungarian copy in the same change.

## Conventions

- `components/site/*` marketing sections · `components/event/*` guest-facing event UI · `components/admin/*` admin UI · `components/ui/*` shadcn primitives
- Files kebab-case; components named exports (`export function EventHeader()`), no default exports except App Router pages/layouts
- Server Components by default; add `'use client'` only for state, refs, or browser APIs
- Shared logic in `lib/` (`lib/slug.ts`, `lib/supabase/*`); never duplicate a helper across components
- Import alias `@/*` from the repo root
