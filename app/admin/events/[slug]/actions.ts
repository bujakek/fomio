'use server'

import { PHOTO_BUCKET } from '@/lib/storage'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

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

/**
 * Erase an event: every object, every row, permanently.
 *
 * This is the one destructive path in the product, and the only thing behind
 * the FAQ's promise that a host can delete an event and its contents. It also
 * covers a GDPR erasure request, which is why it removes objects rather than
 * only rows.
 *
 * Like the export, it runs on the host's own session rather than the service
 * key: the storage policies already scope object writes to folders the caller
 * owns, and `getOwnedEventBySlug` returning null is the ownership check.
 *
 * Order matters. Objects first, rows second — deleting the event cascades the
 * photo rows away, and without them there is no record of which objects to
 * remove. Reversed, the files would be orphaned in the bucket forever, still
 * fetchable at their public URLs, which is precisely what an erasure request
 * is asking you not to do.
 */
export async function deleteEvent(slug: string) {
  const supabase = await createClient()

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, event_name')
    .eq('slug', slug)
    .maybeSingle()
  if (eventError) throw eventError
  if (!event) throw new Error('Nincs ilyen esemény.')

  const { data: listed, error: listError } = await supabase.storage
    .from(PHOTO_BUCKET)
    .list(event.id, { limit: 1000 })
  if (listError) throw listError

  if (listed && listed.length > 0) {
    const paths = listed.map((object) => `${event.id}/${object.name}`)
    const { error: removeError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .remove(paths)
    if (removeError) throw removeError
  }

  // Cascades the photo rows.
  const { data: deleted, error: deleteError } = await supabase
    .from('events')
    .delete()
    .eq('id', event.id)
    .select('id')
  if (deleteError) throw deleteError
  if (!deleted || deleted.length === 0) {
    throw new Error('Az esemény nem törlődött.')
  }

  revalidatePath('/admin')
  redirect('/admin')
}
