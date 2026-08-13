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
