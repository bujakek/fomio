import 'client-only'

import type { PreparedPhoto } from './image'
import { PHOTO_BUCKET, photoStoragePaths } from './storage'
import { createGuestClient } from './supabase/client'

/** Postgres' code for "a policy said no", which PostgREST passes through. */
const RLS_REFUSED = '42501'

/**
 * The album refused the upload — the window closed, or the free photo cap is
 * full.
 *
 * Worth its own type because it is the one upload failure that retrying cannot
 * fix. Every other error here is a flaky venue wifi problem where "Újra" is
 * exactly the right offer; this one needs the queue to stop offering it and
 * say something true instead.
 *
 * The message is deliberately vague about *which* rule refused. A guest cannot
 * act on either answer, and "the couple did not pay for more" is not a thing to
 * put in front of a wedding guest holding a phone.
 */
export class UploadRefusedError extends Error {
  constructor() {
    super('Ez az album most nem fogad új képet.')
    this.name = 'UploadRefusedError'
  }
}

/**
 * Both write paths are gated by RLS, and they report a refusal differently:
 * PostgREST returns the Postgres code, Storage returns an HTTP 403 whose
 * message mentions the policy. Neither is worth showing a guest raw.
 */
function isRefusal(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as {
    code?: string
    statusCode?: string | number
    message?: string
  }
  if (e.code === RLS_REFUSED) return true
  if (String(e.statusCode) === '403') return true
  return /row-level security/i.test(e.message ?? '')
}

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
 *
 * Returns that id. The caller cannot derive it — it is minted here — and the
 * gallery needs it to key the photo it shows before the server has been asked
 * about it.
 */
export async function uploadPhoto({
  eventId,
  prepared,
  uploaderName,
}: {
  eventId: string
  prepared: PreparedPhoto
  uploaderName: string | null
}): Promise<string> {
  const supabase = createGuestClient()
  const photoId = crypto.randomUUID()
  const paths = photoStoragePaths(eventId, photoId)

  // Objects first, row last. A failed insert leaves files nobody references;
  // the reverse would put a row in the gallery pointing at nothing, which
  // renders as a broken tile in someone's wedding album.
  //
  // The two objects go up together. They used to be a sequential loop, which
  // spent a whole round trip on the ~40KB thumbnail after the ~2MB original
  // had already finished — pure latency, repeated once per photo, on the
  // highest-latency network the product will ever run on. Concurrency here
  // does not weaken the ordering above: both still land before the insert.
  const puts = await Promise.all(
    (
      [
        [paths.full, prepared.full],
        [paths.thumb, prepared.thumb],
      ] as const
    ).map(([path, body]) =>
      supabase.storage.from(PHOTO_BUCKET).upload(path, body, {
        contentType: 'image/jpeg',
        cacheControl: '31536000',
      }),
    ),
  )

  for (const { error } of puts) {
    if (error) throw isRefusal(error) ? new UploadRefusedError() : error
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
    taken_at: prepared.takenAt?.toISOString() ?? null,
  })
  if (error) throw isRefusal(error) ? new UploadRefusedError() : error

  return photoId
}
