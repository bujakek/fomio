import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { cache } from 'react'

import { photoPublicUrl } from './storage'
import { DEMO_EVENT_SLUG } from './site'
import type { Database } from './supabase/database.types'
import { publicSupabaseEnv } from './supabase/env'

/** How many thumbnails the landing-page section shows. */
const PREVIEW_LIMIT = 6

export type DemoPhoto = {
  id: string
  thumbUrl: string
  width: number | null
  height: number | null
  uploaderName: string | null
}

export type DemoAlbumPreview = {
  eventName: string
  photoCount: number
  photos: DemoPhoto[]
}

/**
 * Reads the public sample album for the landing page.
 *
 * Deliberately **not** `lib/supabase/server.ts`: that client reads auth
 * cookies, and touching cookies in a Server Component opts the whole route
 * into dynamic rendering. The homepage is the most-cached page on the site and
 * has no session to respect, so it gets a plain anon client instead — the same
 * construction as `createGuestClient()` in `lib/supabase/client.ts`, minus the
 * browser. Freshness comes from the `revalidate` on `app/page.tsx`.
 *
 * Goes through the same `event_by_slug` / `event_photos` RPCs as the real
 * guest routes, so the sample album is subject to exactly the rules a real one
 * is — hidden photos excluded, nothing at all if the gallery is closed.
 *
 * `cache()` for the same reason `getEventBySlug` uses it: Next does not dedupe
 * arbitrary async calls, and this is read once to decide whether to render the
 * real section and again to render it.
 */
export const getDemoAlbumPreview = cache(
  async (): Promise<DemoAlbumPreview | null> => {
    const { url, anonKey } = publicSupabaseEnv()
    const supabase = createClient<Database>(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })

    // Every other query module throws on error so an outage cannot masquerade
    // as an empty result. This one swallows instead, and the difference is
    // deliberate: the caller is the marketing homepage, which has a hardcoded
    // fallback to fall back to. Taking the landing page down because the
    // sample album is unreachable would be a far worse failure than showing
    // the simulation for a few minutes.
    try {
      const { data: event, error: eventError } = await supabase
        .rpc('event_by_slug', { p_slug: DEMO_EVENT_SLUG })
        .maybeSingle()
      if (eventError || !event) return null

      const { data: photos, error: photosError } = await supabase.rpc(
        'event_photos',
        { p_event_id: event.id },
      )
      if (photosError || !photos?.length) return null

      return {
        eventName: event.event_name,
        photoCount: photos.length,
        photos: photos.slice(0, PREVIEW_LIMIT).map((photo) => ({
          id: photo.id,
          thumbUrl: photoPublicUrl(photo.thumb_path),
          width: photo.width,
          height: photo.height,
          uploaderName: photo.uploader_name,
        })),
      }
    } catch {
      return null
    }
  },
)
