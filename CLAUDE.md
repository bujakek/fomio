# Project: Fomio — QR-code shared photo album for events

> The shipped product name is **Fomio**. Domain: `fomio.io`. (Earlier working names "Moments" and "Pillanatok" are deprecated — do not use them in new code or copy.)

## What this is

A web app that lets anyone create an event (wedding, birthday, party), and guests scan a QR code to upload photos straight from their phone browser — **no app download, no account required**. The host (event creator) can later view/download all submitted photos.

**Language:** The product ships in **Hungarian** (`lang="hu"`, all UI copy in Hungarian). This is not multi-language — it's single-language Hungarian. Keep all guest/host-facing copy in Hungarian; code, comments, and this doc stay in English.

**Current phase: MVP / pilot.** The goal is to test on a single real event (a wedding) whether guests actually use the QR to upload mechanic. There is no validated business model yet — this build exists to prove the core mechanic works, not to ship a finished product.

**Original inspiration:** once.film (iOS app, "disposable camera" vibe, delayed reveal). Our version is simpler — no delayed reveal, no film filters, just an immediate shared gallery.

**Design direction (authoritative):** dark **glassmorphism** — near-black background (`#050505`), "liquid glass" surfaces, gradient borders, subtle glow/float animations, Manrope typeface. Tokens live in `app/globals.css`. Match this look across all new pages (event/upload/gallery/admin). (Ignore any earlier "warm/nostalgic/editorial" phrasing — that direction was dropped.)

## Business context (why the scope is this narrow)

- Originally aimed at a B2B model (white-label reseller for photographers), but pivoted to B2C because photographers want to see real usage/referrals before committing their brand to it. Real, visible usage comes first; going back to photographers is a later phase.
- **Do not build in B2B/multi-tenant/branding/token-payment logic** — that's a LATER phase, intentionally out of scope right now.
- Pilot success is measured by guest participation rate: what percentage of attendees actually upload a photo.

## Tech stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript — fullstack, frontend and API routes together
- **Package manager:** **pnpm** (use `pnpm install` / `pnpm dev` / `pnpm build`, not npm)
- **Hosting:** Vercel
- **Database + Auth + Storage:** Supabase (Postgres, Supabase Storage, Supabase Auth if needed) — **not yet installed** (`@supabase/supabase-js` is not in `package.json` yet; adding it is part of build step 1)
- **Styling:** **Tailwind CSS v4** — config is CSS-based via `@theme` in `app/globals.css`; there is NO `tailwind.config.js`. Add design tokens as CSS variables there.
- **UI components:** shadcn/ui (`components.json`, primitives in `components/ui/`) built on `@base-ui/react`; `lucide-react` for icons
- **QR generation:** `qrcode.react` (already a dependency)
- Env vars are already wired up on Vercel (via the Vercel-Supabase integration). If `.env.local` is missing locally, pull it from Vercel — don't hand-edit or commit these values.

## Current state (as of this doc)

- Only the **marketing landing page** exists (`app/page.tsx` + `components/site/*`: hero, stats, how-it-works, testimonials, FAQ, QR preview, final CTA, etc.). It was generated with v0 and is the public homepage at `/`.
- The functional MVP pages do **not** exist yet: `/[slug]` (event page), `/[slug]/upload`, `/[slug]/gallery`, and admin.
- Supabase is not wired up yet; there is no data layer, no `lib/supabase` client, and no migrations.

## Routing

- `/` — public **marketing homepage** (the existing v0 landing page); this stays as the permanent front page.
- `/[slug]` — per-event page (the page guests reach via QR/link).
- `/[slug]/upload`, `/[slug]/gallery` — event upload and gallery.
- Admin lives under its own path (e.g. `/admin`), password-protected.

## What we ARE building for the MVP

- Event page (`/[slug]`) — no branding system yet, dark glassmorphism UI matching the landing page
- Photo upload page (`/[slug]/upload`) — camera or gallery picker, upload with progress indicator
- Gallery page (`/[slug]/gallery`) — host/guests can view submitted photos
- Minimal admin (password-protected or Supabase Auth) — create events, delete photos for moderation
- Data model: `events` table (id, slug, event_name, event_date) + `photos` table (id, event_id, storage_path, uploaded_at)
- QR code generation from the final event URL

## What we are DELIBERATELY LEAVING OUT (don't suggest or build these unless I explicitly ask)

- App Clip / native iOS app
- Photographer/multi-tenant dashboard, branding system for multiple clients
- Payments, token system, revenue-share automation, invoicing
- Guest authentication or mandatory registration
- Delayed reveal, film-filter effects
- Email notifications, multi-language support

If any of these come up as a natural next step while building, flag it, but don't start implementing it automatically. Ask first.

## Priority / build order

1. Next.js project + Supabase connection
2. Data model (events, photos tables via Supabase migration)
3. Landing/event page with static/sample data
4. Upload flow (file to Supabase Storage, DB record)
5. Gallery page
6. Simple admin (create event, delete photos)
7. Live testing on mobile, QR code generation and printing

## Important technical notes

- Client-side image compression before upload is recommended (phone photos can be large; venue wifi may be strained)
- Prefer uploading directly from the browser to Supabase Storage (skip routing the file through a Next.js API route)
- Storage bucket RLS policy: public read, restricted insert — a simple, permissive policy is fine to start, tighten later if needed
- Mobile-first — guests will almost exclusively arrive on their phones from a shared link/QR code
