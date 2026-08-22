/**
 * Seeds the public sample album the landing page links to.
 *
 *   pnpm seed:demo
 *
 * Sibling of `scripts/seed.ts` and shares its pipeline shape — a 4096px-bounded
 * JPEG at q92 plus a ~400px thumb, produced from the landing-page artwork — so
 * the sample album exercises the same payload sizes and layout the real gallery
 * will. Idempotent: re-running reuses the row rather than piling up duplicates.
 *
 * Three deliberate differences from the dev seed:
 *
 *  1. A **fixed slug** (`DEMO_EVENT_SLUG`), not `generateEventSlug()`. Every
 *     real event gets a random suffix because the URL is the only lock on a
 *     private album. This album is meant to be found from the homepage, so the
 *     lock is precisely what we do not want. This is the one sanctioned
 *     exception to that rule.
 *  2. **Uploads closed**, via `uploads_close_at` in the past. Guest uploads are
 *     anonymous and unlimited (backlog 6.6), so an album that is both writable
 *     and advertised on the marketing page is an open invitation.
 *  3. Its own `event_name`, so it cannot collide with the dev seed's event.
 *
 * The name says "sample" rather than naming an invented couple: the album is
 * public, and a fabricated wedding on a public URL is the same problem as a
 * fabricated testimonial.
 *
 * Needs the service role key for the same reason `seed.ts` does — `owner_id`
 * is `not null` and only a host may insert an event.
 */

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

import type { Database } from '../lib/supabase/database.types.ts'
import { DEMO_EVENT_SLUG } from '../lib/site.ts'

/**
 * The sample album gets its own owner rather than riding on a personal
 * account: it is permanent, public, and should not clutter a real host's
 * /admin list. Created here if missing, with no password — sign-in on this
 * project is magic-link only, so there is no credential to store. Nobody is
 * expected to log in as this account; it exists to satisfy `events.owner_id`,
 * which is `not null`.
 *
 * Override with SEED_HOST_EMAIL to attach the album to an existing account.
 */
const DEMO_HOST_EMAIL = 'demo@ourfilm.app'

const EVENT_NAME = 'Bemutató album'
const EVENT_DATE = '2026-06-13'
/** Any past instant closes uploads; fixed so re-runs stay idempotent. */
const UPLOADS_CLOSED_AT = '2026-06-14T22:00:00Z'

const MAX_EDGE = 4096
const THUMB_EDGE = 400
const VIEW_EDGE = 1600
const QUALITY = 92
const THUMB_QUALITY = 80
const VIEW_QUALITY = 85

// Curated rather than "first N of readdir": the album is a shop window, and
// the order it is seeded in is the order the gallery shows.
const SOURCES = [
  { file: 'wedding-dance.webp', uploader: 'Réka' },
  { file: 'guests-laughing.webp', uploader: 'Máté' },
  { file: 'wedding-cake.webp', uploader: 'Nagymama' },
  { file: 'garden-party.webp', uploader: null },
  { file: 'group-lookout.webp', uploader: 'Bence' },
  { file: 'wedding-portrait.webp', uploader: 'Zsófi' },
  { file: 'evening-party.webp', uploader: 'Réka' },
  { file: 'party.webp', uploader: 'Dani' },
  { file: 'birthday.webp', uploader: null },
  { file: 'everyday.webp', uploader: 'Máté' },
]

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
      'Run with: node --env-file=.env.local … (see the seed:demo script in package.json).',
  )
}

const supabase = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false },
})

async function main() {
  // --- host -----------------------------------------------------------------
  // Unlike seed.ts, this does not ask which account to use: the sample album
  // has one correct owner and creating it here keeps the script reproducible
  // on a fresh project.
  const wantedEmail = process.env.SEED_HOST_EMAIL ?? DEMO_HOST_EMAIL

  const { data: userList, error: userError } =
    await supabase.auth.admin.listUsers()
  if (userError) throw userError

  let host = userList.users.find((u) => u.email === wantedEmail)

  if (!host) {
    if (process.env.SEED_HOST_EMAIL) {
      const known = userList.users.map((u) => u.email).join(', ') || 'none'
      throw new Error(
        `No auth user for SEED_HOST_EMAIL=${wantedEmail}. Known accounts: ${known}`,
      )
    }
    const { data: created, error: createUserError } =
      await supabase.auth.admin.createUser({
        email: wantedEmail,
        // Confirmed on creation: there is no mailbox behind this address, so
        // an unconfirmed user would sit in limbo forever.
        email_confirm: true,
      })
    if (createUserError) throw createUserError
    host = created.user
    console.log(`created demo host ${wantedEmail}`)
  } else {
    console.log(`reusing demo host ${wantedEmail}`)
  }

  // --- event ----------------------------------------------------------------
  // Keyed on the slug, not on owner+name: the slug is what the landing page
  // hardcodes, so it is the identity that actually matters here.
  const { data: existing, error: existingError } = await supabase
    .from('events')
    .select('id, slug, owner_id')
    .eq('slug', DEMO_EVENT_SLUG)
    .maybeSingle()
  if (existingError) throw existingError

  let eventId: string

  if (existing) {
    eventId = existing.id
    // Re-assert the closed window on every run. An album that quietly reopened
    // — hand-edited in the dashboard, or seeded before this script closed it —
    // would be a writable album advertised on the homepage.
    const { error: closeError } = await supabase
      .from('events')
      .update({ uploads_close_at: UPLOADS_CLOSED_AT })
      .eq('id', eventId)
    if (closeError) throw closeError
    console.log(`reusing event ${existing.slug} (uploads re-closed)`)
  } else {
    const { data: created, error: createError } = await supabase
      .from('events')
      .insert({
        slug: DEMO_EVENT_SLUG,
        event_name: EVENT_NAME,
        event_date: EVENT_DATE,
        uploads_close_at: UPLOADS_CLOSED_AT,
        owner_id: host.id,
      })
      .select('id')
      .single()
    if (createError) throw createError
    eventId = created.id
    console.log(`created event ${DEMO_EVENT_SLUG}`)
  }

  // --- photos ---------------------------------------------------------------
  const { count } = await supabase
    .from('photos')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)

  if (count && count > 0) {
    console.log(`${count} photos already present — skipping upload`)
    console.log(`\n  /e/${DEMO_EVENT_SLUG}\n`)
    return
  }

  const imageDir = path.join(import.meta.dirname, '..', 'public', 'images')

  for (const { file, uploader } of SOURCES) {
    const source = await readFile(path.join(imageDir, file))
    const photoId = randomUUID()

    const full = await sharp(source)
      .rotate() // bake in EXIF orientation, as the browser pipeline does
      .resize(MAX_EDGE, MAX_EDGE, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: QUALITY })
      .toBuffer()
    const meta = await sharp(full).metadata()

    const thumb = await sharp(source)
      .rotate()
      .resize(THUMB_EDGE, THUMB_EDGE, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: THUMB_QUALITY })
      .toBuffer()

    // The lightbox render, same as the browser pipeline produces. Without it
    // seeded albums would fall back to the 4096px master and quietly hide the
    // very decode cost this exists to avoid.
    const view = await sharp(source)
      .rotate()
      .resize(VIEW_EDGE, VIEW_EDGE, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: VIEW_QUALITY })
      .toBuffer()

    const fullPath = `${eventId}/${photoId}.jpg`
    const thumbPath = `${eventId}/${photoId}_thumb.jpg`
    const viewPath = `${eventId}/${photoId}_view.jpg`

    for (const [objectPath, body] of [
      [fullPath, full],
      [thumbPath, thumb],
      [viewPath, view],
    ] as const) {
      const { error } = await supabase.storage
        .from('event-photos')
        .upload(objectPath, body, {
          contentType: 'image/jpeg',
          cacheControl: '31536000',
          upsert: true,
        })
      if (error) throw error
    }

    // Object first, row second: a failed insert leaves a harmless orphan,
    // whereas the reverse puts a broken tile in the gallery.
    const { error: rowError } = await supabase.from('photos').insert({
      id: photoId,
      event_id: eventId,
      storage_path: fullPath,
      thumb_path: thumbPath,
      view_path: viewPath,
      uploader_name: uploader,
      width: meta.width ?? null,
      height: meta.height ?? null,
      byte_size: full.byteLength,
      mime_type: 'image/jpeg',
    })
    if (rowError) throw rowError

    console.log(
      `  ${file} → ${(full.byteLength / 1024).toFixed(0)}KB full, ` +
        `${(thumb.byteLength / 1024).toFixed(0)}KB thumb`,
    )
  }

  console.log(`\nseeded ${SOURCES.length} photos\n\n  /e/${DEMO_EVENT_SLUG}\n`)
}

await main()
