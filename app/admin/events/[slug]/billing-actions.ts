'use server'

import { getEventQuota } from '@/lib/billing'
import { getOwnedEventBySlug } from '@/lib/events'
import { requestOrigin } from '@/lib/request-origin'
import { getStripe } from '@/lib/stripe/client'
import { stripeEnv, stripeIsConfigured } from '@/lib/stripe/env'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type CheckoutState = { error: string | null }

/**
 * Sends the host to Stripe Checkout to lift the free cap on one event.
 *
 * Hosted Checkout rather than an embedded card form, and not for want of
 * ambition: a redirect keeps every card number, every 3-D Secure challenge and
 * every SCA rule inside Stripe's page, which is the difference between SAQ A
 * and a compliance project. The pilot is one wedding — there is no version of
 * this where building a card form is the right use of the time.
 *
 * The payment is recorded by the webhook, never here. A host who closes the
 * tab on Stripe's success page must still end up with an unlocked album, and
 * the only message that survives that is the one Stripe sends server-to-server.
 */
export async function startEventCheckout(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const slug = String(formData.get('slug') ?? '').trim()
  if (!slug) return { error: 'Hiányzó esemény.' }

  if (!stripeIsConfigured()) {
    return {
      error:
        'A fizetés még nincs beállítva. Szólj nekünk, és elintézzük — addig ' +
        'az album és a feltöltés változatlanul működik.',
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Lejárt a munkameneted. Lépj be újra.' }

  // Null covers both "no such event" and "not yours" — RLS makes them the same
  // answer, which is the correct one to give either way.
  const event = await getOwnedEventBySlug(slug)
  if (!event) return { error: 'Nincs ilyen esemény.' }

  // The ledger deliberately has no unique index stopping a second paid row, so
  // this is the check that stops a host paying twice for the same album. It
  // reads the database predicate rather than a purchase row, so an
  // admin-owned event is correctly reported as already unlimited.
  const quota = await getEventQuota(event.id)
  if (quota.unlimited) {
    return { error: 'Ez az esemény már korlátlan — nincs mit fizetni.' }
  }

  const origin = await requestOrigin()
  let checkoutUrl: string

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: stripeEnv().eventPriceId, quantity: 1 }],
      success_url: `${origin}/admin/events/${event.slug}?checkout=success`,
      cancel_url: `${origin}/admin/events/${event.slug}?checkout=cancelled`,
      // Both, and not by accident. `metadata` is what the webhook reads;
      // `client_reference_id` is what shows up in the Stripe dashboard's
      // search, which is where you will be looking at 2am when a host says
      // they paid and the album is still capped.
      client_reference_id: event.id,
      metadata: { event_id: event.id, owner_id: user.id },
      // Copied onto the PaymentIntent as well, because a refund webhook
      // carries a charge rather than a session and would otherwise have no
      // route back to the event.
      payment_intent_data: {
        metadata: { event_id: event.id, owner_id: user.id },
      },
      customer_email: user.email ?? undefined,
      locale: 'hu',
    })

    if (!session.url) {
      return { error: 'A fizetési oldal nem indult el. Próbáld újra.' }
    }
    checkoutUrl = session.url

    // Best effort, and intentionally not awaited into the happy path's
    // correctness. The webhook upserts on this session id, so it fills the row
    // in if this insert never happened; what the row buys us is a record that
    // *someone started paying*, which is the only trace left when a webhook is
    // misconfigured and the money is real.
    const { error: ledgerError } = await supabase.from('purchases').insert({
      event_id: event.id,
      owner_id: user.id,
      stripe_checkout_session_id: session.id,
      status: 'pending',
    })
    if (ledgerError) {
      console.error('Could not record pending purchase', ledgerError)
    }
  } catch (e) {
    console.error('Stripe checkout session failed', e)
    return { error: 'Nem sikerült elindítani a fizetést. Próbáld újra.' }
  }

  // Outside the try on purpose: redirect() signals by throwing, so catching
  // around it would swallow the navigation and report a failure instead.
  redirect(checkoutUrl)
}
