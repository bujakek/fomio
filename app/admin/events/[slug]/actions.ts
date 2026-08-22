'use server'

import { eventLocalToIso } from '@/lib/format'
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

  // The toggle lives on the settings page; the event page is revalidated too
  // because it links to it and shares the same event read.
  revalidatePath(`/admin/events/${slug}/settings`)
  revalidatePath(`/admin/events/${slug}`)
  revalidatePath(`/e/${slug}`)
  revalidatePath(`/e/${slug}/gallery`)
}

/**
 * Move the moment uploads stop.
 *
 * Every event has one — it is required at creation — so this only ever moves
 * it, never clears it. There is no "leave it open forever" here on purpose:
 * that was the old default, and it is what this change exists to remove.
 *
 * The value arrives as a `datetime-local` string and is read as the event's
 * wall clock, the same as at creation. Moving it into the past is allowed and
 * is the fastest way to close an album early — a host standing in the room at
 * the end of the night should not have to compute a future timestamp to stop
 * uploads now.
 */
export async function setUploadDeadline(slug: string, local: string) {
  const closesAt = eventLocalToIso(local)
  if (!closesAt) throw new Error('Add meg, mikor záruljon a feltöltés.')

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('events')
    .update({ uploads_close_at: closesAt })
    .eq('slug', slug)
    .select('id')

  if (error) throw error
  if (!data || data.length === 0) {
    throw new Error('Az esemény nem módosult.')
  }

  revalidatePath(`/admin/events/${slug}/settings`)
  revalidatePath(`/admin/events/${slug}`)
  revalidatePath('/admin')
  revalidatePath(`/e/${slug}`)
  revalidatePath(`/e/${slug}/gallery`)
}

/** One page of a Storage listing. `list()` returns a page, not a total — the
 *  API caps what it will hand back however large a `limit` you ask for, so the
 *  loop below is what makes the enumeration complete, not this number. */
const LIST_PAGE = 100

/** Bound on the paging loop. 20k objects is an order of magnitude past any
 *  real album, so reaching it means `offset` is not advancing rather than that
 *  someone shot ten thousand photos — and without the bound that is an
 *  infinite loop. Treated as a failure, never as "done". */
const MAX_LIST_PAGES = 200

/** `remove()` carries every path in one request body, so a large album goes in
 *  batches rather than a single enormous call. */
const REMOVE_BATCH = 100

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
 *
 * That last paragraph is also why every step below is verified rather than
 * assumed. A single unpaginated `list()` sees one page — about 500 photos,
 * since each is two objects — and everything past it would be orphaned in a
 * *public* bucket with the only record of its existence cascaded away. Erasure
 * that silently half-succeeds is worse than erasure that fails, because the
 * host is told the photos are gone. So: page until the listing is exhausted,
 * check that every removal actually removed, and confirm the folder is empty
 * before the rows go. Any doubt throws with the rows still intact, which keeps
 * the objects findable for a retry.
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

  // Collect every path first, remove second. Deleting inside the paging loop
  // would shift the offsets out from under it and skip whole pages.
  const paths: string[] = []
  let listingComplete = false

  for (let page = 0; page < MAX_LIST_PAGES; page++) {
    const { data: listed, error: listError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .list(event.id, {
        limit: LIST_PAGE,
        offset: paths.length,
        // Explicit, so the ordering the offsets index into cannot change
        // between one page and the next.
        sortBy: { column: 'name', order: 'asc' },
      })
    if (listError) throw listError

    // Advance by what came back, not by LIST_PAGE, and stop only on an empty
    // page. A short page must not end the loop: the API is free to return
    // fewer objects than asked for, and treating that as the end is exactly
    // the bug that left albums half-deleted.
    if (!listed || listed.length === 0) {
      listingComplete = true
      break
    }
    paths.push(...listed.map((object) => `${event.id}/${object.name}`))
  }

  if (!listingComplete) {
    throw new Error('Nem sikerült végigolvasni a képeket. Próbáld újra.')
  }

  for (let i = 0; i < paths.length; i += REMOVE_BATCH) {
    const batch = paths.slice(i, i + REMOVE_BATCH)
    const { data: removed, error: removeError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .remove(batch)
    if (removeError) throw removeError
    // `remove()` reports what it deleted and silently omits what it could not,
    // so the count is the only signal that a path survived. Throwing here
    // leaves the rows in place, so a retry can still find the stragglers.
    if (!removed || removed.length !== batch.length) {
      throw new Error('Nem sikerült minden képet törölni. Próbáld újra.')
    }
  }

  // Uploads stay open throughout, so a guest can land a photo after the
  // listing above and before the rows go. Confirm the folder is empty instead
  // of assuming it — this is the last moment at which an object left behind is
  // still findable.
  const { data: leftover, error: leftoverError } = await supabase.storage
    .from(PHOTO_BUCKET)
    .list(event.id, { limit: 1 })
  if (leftoverError) throw leftoverError
  if (leftover && leftover.length > 0) {
    throw new Error('Közben új kép érkezett. Indítsd újra a törlést.')
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
