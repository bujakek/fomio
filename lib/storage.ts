import { publicSupabaseEnv } from './supabase/env'

export const PHOTO_BUCKET = 'event-photos'

/**
 * The one place the storage layout is defined.
 *
 * Every RLS policy on `storage.objects` reads the event id out of the first
 * path segment, so a stray path shape does not fail loudly — it fails as a
 * permission denial that looks like a broken upload. Build paths here and
 * nowhere else.
 */
export function photoStoragePaths(eventId: string, photoId: string) {
  return {
    full: `${eventId}/${photoId}.jpg`,
    thumb: `${eventId}/${photoId}_thumb.jpg`,
    view: `${eventId}/${photoId}_view.jpg`,
  }
}

/**
 * Public URL for an object. The bucket is public, so this needs no client,
 * no signing and no round trip — which is why it lives apart from the query
 * modules and stays safe to import from a Client Component.
 */
export function photoPublicUrl(storagePath: string) {
  const { url } = publicSupabaseEnv()
  return `${url}/storage/v1/object/public/${PHOTO_BUCKET}/${storagePath}`
}
