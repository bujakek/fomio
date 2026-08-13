import 'client-only'

import type { PreparedPhoto } from './image'
import { PHOTO_BUCKET, photoStoragePaths } from './storage'
import { createClient } from './supabase/client'

/**
 * Puts one prepared photo into Storage and records it.
 *
 * The photo id is generated here rather than passed in, so every attempt gets
 * fresh paths. That matters for retries: guests hold insert-only rights on
 * storage objects, so they cannot overwrite, and re-using an id after a partial
 * failure would collide with the object the failed attempt already wrote. A
 * fresh id sidesteps it and leaves at worst an orphan, which is harmless and
 * cleanable — the failure mode the ordering below is chosen to avoid is far
 * worse.
 */
export async function uploadPhoto({
  eventId,
  prepared,
  uploaderName,
}: {
  eventId: string
  prepared: PreparedPhoto
  uploaderName: string | null
}): Promise<void> {
  const supabase = createClient()
  const photoId = crypto.randomUUID()
  const paths = photoStoragePaths(eventId, photoId)

  // Objects first, row last. A failed insert leaves files nobody references;
  // the reverse would put a row in the gallery pointing at nothing, which
  // renders as a broken tile in someone's wedding album.
  for (const [path, body] of [
    [paths.full, prepared.full],
    [paths.thumb, prepared.thumb],
  ] as const) {
    const { error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, body, {
        contentType: 'image/jpeg',
        cacheControl: '31536000',
      })
    if (error) throw error
  }

  // No `.select()` chained on purpose. That would ask to read the row back,
  // and guests have no read policy on `photos` — the insert would succeed and
  // the call would still report an error.
  const { error } = await supabase.from('photos').insert({
    id: photoId,
    event_id: eventId,
    storage_path: paths.full,
    thumb_path: paths.thumb,
    uploader_name: uploaderName || null,
    width: prepared.width,
    height: prepared.height,
    byte_size: prepared.full.size,
    mime_type: 'image/jpeg',
  })
  if (error) throw error
}
