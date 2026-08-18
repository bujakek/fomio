import 'server-only'

import { createClient } from './supabase/server'
import type { Database } from './supabase/database.types'

export type GalleryPhoto =
  Database['public']['Functions']['event_photos']['Returns'][number]

/**
 * Visible photos for one event, newest first.
 *
 * The RPC is the single definition of "visible": it excludes photos the host
 * has hidden, and returns nothing at all while the gallery is closed
 * (`gallery_hidden_at`). Filtering in the caller instead would let the two
 * rules drift apart between the guest gallery and anything else that lists
 * photos.
 *
 * An empty array is therefore ambiguous on its own — it could mean no uploads
 * yet or a closed gallery. Check `gallery_private` on the event to tell the
 * guest which, rather than showing an empty grid that reads as "nobody came".
 */
export async function getEventPhotos(eventId: string): Promise<GalleryPhoto[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('event_photos', {
    p_event_id: eventId,
  })

  if (error) throw error

  return data ?? []
}

export type HostPhoto = {
  id: string
  storage_path: string
  thumb_path: string
  uploader_name: string | null
  hidden_at: string | null
  width: number | null
  height: number | null
  created_at: string
  /** EXIF capture time; null for files that carried none. Readers must fall
   *  back to `created_at`. */
  taken_at: string | null
}

/**
 * Every photo in an event, hidden ones included — the moderation view.
 *
 * Reads the table rather than `event_photos()`, because that RPC exists to
 * hide exactly what a host needs to see here. RLS scopes the result to events
 * the caller owns, so the `event_id` filter narrows rather than protects.
 */
export async function getAllEventPhotos(eventId: string): Promise<HostPhoto[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('photos')
    .select(
      'id, storage_path, thumb_path, uploader_name, hidden_at, width, height, created_at, taken_at',
    )
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}
