import 'server-only'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import type { Database } from './database.types'
import { publicSupabaseEnv } from './env'

/**
 * The service-role client. It bypasses RLS completely — read every call made
 * with it as though the policies did not exist, because for this client they
 * do not.
 *
 * There is exactly one caller: the Stripe webhook. It has no user session to
 * act on behalf of (Stripe is the caller, not the host), and it has to write
 * `purchases.status = 'paid'`, which no policy grants to anyone. That gap is
 * deliberate: a host who could write that column could hand themselves a paid
 * album for free.
 *
 * Deliberately not used by the ZIP export or the delete path, which both look
 * like candidates. Those run on the host's own session, and
 * `getOwnedEventBySlug` returning null is their ownership check — keeping the
 * service key out of anything that streams user data is worth the sentence.
 *
 * A function rather than a module constant, matching `publicSupabaseEnv`: a
 * throw at import time would take down the whole build rather than the one
 * request that needed the key.
 */
export function createAdminClient() {
  const { url } = publicSupabaseEnv()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY. The Stripe webhook needs it to ' +
        'record payments — no RLS policy allows any user to mark a purchase ' +
        'paid. Copy it from the Supabase dashboard; see the Local env ' +
        'section of CLAUDE.md.',
    )
  }

  return createSupabaseClient<Database>(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}
