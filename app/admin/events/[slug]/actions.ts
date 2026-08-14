'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Hide or restore a single photo.
 *
 * Soft delete only — `hidden_at` is set, never a row removed. A host clearing
 * an unflattering shot at 1am should not be able to destroy a guest's photo
 * permanently by tapping the wrong tile.
 *
 * Note the object itself stays fetchable at its public URL for anyone who
 * already has it, and public objects are CDN-cached. Hiding removes a photo
 * from the album, which is what moderation means here; it is not erasure.
 */
export async function setPhotoHidden(
  slug: string,
  photoId: string,
  hidden: boolean,
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('photos')
    .update({ hidden_at: hidden ? new Date().toISOString() : null })
    .eq('id', photoId)
    .select('id')

  if (error) throw error
  // An UPDATE has to SELECT the row first, so a missing or non-matching read
  // policy returns zero rows with no error at all. Checking the count is the
  // difference between "moderated" and "silently did nothing".
  if (!data || data.length === 0) {
    throw new Error('A kép nem módosult — lehet, hogy nincs jogosultságod.')
  }

  revalidatePath(`/admin/events/${slug}`)
  revalidatePath(`/e/${slug}/gallery`)
}

/** Close the gallery to guests, or reopen it. Uploads continue either way. */
export async function setGalleryHidden(slug: string, hidden: boolean) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('events')
    .update({ gallery_hidden_at: hidden ? new Date().toISOString() : null })
    .eq('slug', slug)
    .select('id')

  if (error) throw error
  if (!data || data.length === 0) {
    throw new Error('Az esemény nem módosult.')
  }

  revalidatePath(`/admin/events/${slug}`)
  revalidatePath(`/e/${slug}`)
  revalidatePath(`/e/${slug}/gallery`)
}
