'use server'

import { generateEventSlug } from '@/lib/slug'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type CreateEventState = { error: string | null }

const SLUG_ATTEMPTS = 5
const UNIQUE_VIOLATION = '23505'

export async function createEvent(
  _prev: CreateEventState,
  formData: FormData,
): Promise<CreateEventState> {
  const name = String(formData.get('event_name') ?? '').trim()
  const date = String(formData.get('event_date') ?? '').trim()
  // Computed in the browser, because a datetime-local value carries no zone
  // and resolving it here would silently use the server's.
  const closesAt = String(formData.get('uploads_close_at') ?? '').trim()

  if (!name) return { error: 'Adj nevet az eseménynek.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Lejárt a munkameneted. Lépj be újra.' }

  let slug: string | null = null

  for (let attempt = 0; attempt < SLUG_ATTEMPTS; attempt++) {
    const candidate = generateEventSlug(name)
    const { error } = await supabase.from('events').insert({
      slug: candidate,
      event_name: name,
      event_date: date || null,
      uploads_close_at: closesAt || null,
      owner_id: user.id,
    })

    if (!error) {
      slug = candidate
      break
    }
    // Only a slug collision is worth retrying — a fresh random suffix clears
    // it. Anything else is a real failure and should surface.
    if (error.code !== UNIQUE_VIOLATION) {
      return { error: `Nem sikerült létrehozni: ${error.message}` }
    }
  }

  if (!slug) {
    return { error: 'Nem sikerült egyedi linket generálni. Próbáld újra.' }
  }

  // Outside any try/catch on purpose: redirect() signals by throwing, so
  // catching around it would swallow the navigation.
  redirect(`/admin/events/${slug}`)
}
