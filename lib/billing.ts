import 'server-only'

import { cache } from 'react'

import type { Database } from './supabase/database.types'
import { createClient } from './supabase/server'

export type PurchaseStatus = Database['public']['Enums']['purchase_status']
export type Purchase = Database['public']['Tables']['purchases']['Row']

/**
 * Stripe takes amounts in a currency's minor unit. HUF is one of the awkward
 * ones: it is *presented* as a zero-decimal currency (nobody prices a wedding
 * album at 9 900,00 Ft) but the API still expects minor units, and additionally
 * requires the amount to divide evenly by 100. So 9 900 Ft is `990000`.
 *
 * Getting this wrong is a factor-of-100 error in either direction, which is
 * the kind of bug that either charges nothing or charges a fortune, so the
 * conversion lives here and nowhere else.
 */
export const HUF_MINOR_PER_FORINT = 100

const HUF = new Intl.NumberFormat('hu-HU', {
  style: 'currency',
  currency: 'HUF',
  maximumFractionDigits: 0,
})

/** Formats what Stripe reported for display: `990000` → `9 900 Ft`. */
export function formatAmount(
  amountMinor: number | null,
  currency: string | null,
): string | null {
  if (amountMinor === null) return null
  // Only HUF is ever sold — the product is Hungarian-only. Anything else means
  // a Price was created in the wrong currency, which is worth showing plainly
  // rather than rendering as forints.
  if (currency && currency.toLowerCase() !== 'huf') {
    return `${amountMinor / 100} ${currency.toUpperCase()}`
  }
  return HUF.format(amountMinor / HUF_MINOR_PER_FORINT)
}

export type EventQuota = {
  /** How many photos the free tier allows per event. */
  photoLimit: number
  /** How many are still allowed, or null when the event has no cap. */
  remaining: number | null
  unlimited: boolean
}

/**
 * How much room is left in an event.
 *
 * Goes through the `event_upload_quota` RPC because guests need it too and
 * guests cannot read `photos` — the same reason every other guest-facing read
 * in this codebase is a `security definer` function.
 *
 * Note the cast. The generator types a table-returning function's columns as
 * non-nullable, so it claims `remaining: number` when the function genuinely
 * returns null for an unlimited event. `event_by_slug` has the same wrinkle
 * with `event_date`; the honest type is asserted here so no caller inherits
 * the lie.
 */
export const getEventQuota = cache(
  async (eventId: string): Promise<EventQuota> => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .rpc('event_upload_quota', { p_event_id: eventId })
      .maybeSingle()

    if (error) throw error
    if (!data) throw new Error('Az esemény kvótája nem elérhető.')

    const remaining = data.remaining as number | null

    return {
      photoLimit: data.photo_limit,
      remaining: data.unlimited ? null : (remaining ?? 0),
      unlimited: data.unlimited,
    }
  },
)

/**
 * `getEventQuota`, but never fatal.
 *
 * Billing is the newest thing in this codebase and the least important thing
 * on the page it appears on. An album is worth more than a paywall: if the
 * quota cannot be read — the migration is not pushed yet, Postgres is having a
 * moment — the guest page must still render and guests must still be able to
 * upload. Returning null makes the UI behave as though there were no cap,
 * which is also the truth in the specific case that will actually happen: a
 * database without `event_upload_quota` is a database whose
 * `event_accepts_uploads` has no cap in it either.
 *
 * Loud in the log, quiet in the UI. The admin side deliberately does not use
 * this — a host looking at their billing card deserves to be told when it is
 * broken.
 */
export async function getEventQuotaOrNull(
  eventId: string,
): Promise<EventQuota | null> {
  try {
    return await getEventQuota(eventId)
  } catch (e) {
    console.error('Could not read upload quota; treating as uncapped', e)
    return null
  }
}

/**
 * The purchase record that best describes an event's billing state.
 *
 * RLS scopes this to the host's own events (and everything, for an admin), so
 * an empty result means "not yours or not bought" — the same answer either
 * way, exactly as with `getOwnedEventBySlug`.
 *
 * Ordered by `paid_at` before `created_at`, which is not the obvious choice
 * and matters. A host who abandons checkout leaves a `pending` row behind, and
 * those rows are kept on purpose as a ledger of attempts. Newest-first would
 * then surface the abandoned attempt over the payment that actually went
 * through and report a paid album as unpaid. Only settled rows carry a
 * `paid_at`, so sorting on it puts real outcomes first and leaves the pending
 * ones where they belong.
 *
 * This is for showing the host what happened. Whether the cap is lifted is not
 * decided here — `getEventQuota().unlimited` is, because it also answers the
 * admin-owned case that no purchase row will ever describe.
 */
export const getEventPurchase = cache(
  async (eventId: string): Promise<Purchase | null> => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('purchases')
      .select('*')
      .eq('event_id', eventId)
      .order('paid_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data
  },
)
