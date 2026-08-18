import 'server-only'

import { cache } from 'react'

import { createClient } from './supabase/server'
import type { Database } from './supabase/database.types'

/**
 * What a guest is allowed to know about an event. Derived from the RPC's own
 * return type rather than hand-written, so adding a column to the function
 * without updating callers is a compile error instead of a silent `undefined`.
 * Note there is no `owner_id` — the function deliberately withholds it.
 */
export type GuestEvent =
  Database['public']['Functions']['event_by_slug']['Returns'][number]

/**
 * Look up an event by the slug in its URL.
 *
 * Goes through the `event_by_slug` RPC, not `.from('events')`: guests have no
 * read policy on the table, precisely so that nobody can list every album.
 * You must already know the slug to get anything back.
 *
 * Wrapped in React `cache()` because every event route needs the same row
 * twice — once in `generateMetadata` to title the page, once in the component.
 * Unlike `fetch`, Next does not dedupe arbitrary async calls, so without this
 * each render costs two identical round trips.
 */
export const getEventBySlug = cache(
  async (slug: string): Promise<GuestEvent | null> => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .rpc('event_by_slug', { p_slug: slug })
      .maybeSingle()

    // supabase-js resolves rather than rejects on a failed query, so an
    // unchecked call here would quietly return null and render a 404 for what
    // is actually an outage.
    if (error) throw error

    return data
  },
)

/**
 * Whether guests can still upload. Mirrors `event_accepts_uploads()`, which is
 * the real enforcement — this only decides what the UI offers. Never rely on
 * it for correctness; the database refuses a closed event regardless.
 */
export function uploadsAreOpen(event: GuestEvent): boolean {
  if (!event.uploads_close_at) return true
  return new Date(event.uploads_close_at) > new Date()
}

export type OwnedEvent = {
  id: string
  slug: string
  event_name: string
  event_date: string | null
  uploads_close_at: string | null
  gallery_hidden_at: string | null
  created_at: string
}

/**
 * Events belonging to the signed-in host.
 *
 * Reads the table directly rather than an RPC — unlike guests, a host has a
 * read policy, and it is scoped to `owner_id = auth.uid()`. There is
 * deliberately no owner filter in this query: adding one would imply the
 * database is not already enforcing it, and the day someone removes the
 * `.eq()` believing RLS has their back, it should still be true.
 */
export async function getOwnedEvents(): Promise<OwnedEvent[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('events')
    .select(
      'id, slug, event_name, event_date, uploads_close_at, gallery_hidden_at, created_at',
    )
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

/**
 * One of the host's own events, by slug. Returns null when it does not exist
 * *or* belongs to someone else — RLS makes those indistinguishable here, which
 * is the correct answer to give either way.
 */
export async function getOwnedEventBySlug(
  slug: string,
): Promise<OwnedEvent | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('events')
    .select(
      'id, slug, event_name, event_date, uploads_close_at, gallery_hidden_at, created_at',
    )
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw error
  return data
}

export type EventWithPreview = OwnedEvent & {
  photoCount: number
  /** A few thumbnails for the list, newest first. */
  previews: string[]
}

/**
 * The admin list, with enough of each album to recognise it at a glance.
 *
 * Two queries, not one per event: fetching photos per row would be an N+1 that
 * grows with the number of events. It does pull every photo row the host owns
 * (three small columns), which is fine at pilot scale and would want a
 * per-event aggregate — an RPC or a view — before it is thousands.
 */
export async function getOwnedEventsWithPreviews(): Promise<
  EventWithPreview[]
> {
  const supabase = await createClient()
  const events = await getOwnedEvents()
  if (events.length === 0) return []

  const { data: photos, error } = await supabase
    .from('photos')
    .select('event_id, thumb_path, hidden_at, created_at')
    .in(
      'event_id',
      events.map((e) => e.id),
    )
    .order('created_at', { ascending: false })

  if (error) throw error

  return events.map((event) => {
    const own = (photos ?? []).filter((p) => p.event_id === event.id)
    return {
      ...event,
      photoCount: own.length,
      // Hidden photos are excluded from the strip — a moderated shot should not
      // be the thumbnail representing the album.
      previews: own
        .filter((p) => p.hidden_at === null)
        .slice(0, 4)
        .map((p) => p.thumb_path),
    }
  })
}

/** Uploads still open? Mirrors the database rule; used only for display. */
export function eventIsActive(event: {
  uploads_close_at: string | null
}): boolean {
  if (!event.uploads_close_at) return true
  return new Date(event.uploads_close_at) > new Date()
}
