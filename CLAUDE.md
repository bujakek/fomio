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

`.env.local` is gitignored and **must never be committed**. It is maintained **by hand** — only these three keys are needed:

```bash
NEXT_PUBLIC_SUPABASE_URL=       # Supabase dashboard → Project Settings → API Keys
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # the anon / public key
SUPABASE_SERVICE_ROLE_KEY=      # service_role; server-only, admin ZIP export
```

**`vercel env pull` does not work on this project — don't reach for it.** The Vercel–Supabase integration created all 16 of its variables as _Sensitive_, which on Vercel means write-only: the value cannot be read back by the CLI, the API or the dashboard, and a pull returns the literal string `[SENSITIVE]` for every one. This is a property of the Sensitive flag, not of the environment scope, so re-scoping them to Development does not help either. Copy the three values from the Supabase dashboard instead.

The integration's other variables are irrelevant here: the `POSTGRES_*` ones are connection strings for direct SQL clients, and `supabase-js` talks over HTTP. It also provisions Supabase's newer `publishable`/`secret` keys alongside the legacy `anon`/`service_role` pair — the code expects the legacy names; migrating is a deliberate choice, not something to drift into.

Deployed builds are unaffected: Vercel injects all of these at build and runtime. This is purely a local-development concern.

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
- **Host/admin: Supabase Auth magic link.** Only the admin area is protected. Every event has an `owner_id`, and RLS scopes host reads and writes to `owner_id = auth.uid()` — a signed-in user who owns nothing sees nothing. This is ownership scoping, **not** the multi-tenant dashboard ruled out below.
- Privacy comes from the URL being unguessable and unindexed — add `noindex` to event routes. Slugs therefore carry a random suffix (`anna-peter-k3f9x7`); `slugify()` stays deterministic for the QR preview, and `generateEventSlug()` is what real events get. Never create an event with a bare `slugify()` result.

## Data model (settled)

Details, DDL, and RLS live in `.cursor/skills/fomio-supabase/SKILL.md`. Shape:

- **`events`** — `id`, `slug` (unique), `event_name`, `event_date`, `uploads_close_at` (upload window; gallery stays viewable after), `gallery_hidden_at` (set = guests upload but cannot view; host togglable both ways), `owner_id` (→ `auth.users`; the host, and what every RLS host policy keys off), `created_at`

- **`photos`** — `id`, `event_id`, `storage_path`, `thumb_path`, `uploader_name` (nullable — optional guest nickname, remembered on their device), `hidden_at` (soft delete for moderation; never hard-delete), `width`, `height`, `byte_size`, `mime_type` (so the gallery grid reserves space and avoids layout shift), `created_at`

**Guests never read these tables directly.** The anon key is public, so any table `anon` can `select` is a table anyone can list — a permissive read policy on `events` would hand out every album's slug and make the unguessable URL pointless. Guest reads go through `security definer` functions keyed on the slug or event id (`event_by_slug`, `event_photos`); admin reads the tables directly under ownership policies. Details in the Supabase skill.

Storage layout: `event-photos/{event_id}/{photo_id}.jpg` plus `event-photos/{event_id}/{photo_id}_thumb.jpg`.

**The gallery must serve the thumb, never the full image.** A 4096px/~2MB file is the right artifact to download and print, and completely the wrong one to tile at 200px — a single guest scrolling a 600-photo album would pull over a gigabyte. The client already holds the decoded bitmap during upload, so the ~400px thumb is nearly free to produce there.

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

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
