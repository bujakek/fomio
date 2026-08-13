import { createBrowserClient } from '@supabase/ssr'

import type { Database } from './database.types'
import { publicSupabaseEnv } from './env'

/**
 * Supabase client for the browser: guest uploads and any gallery interactivity.
 *
 * Runs as the `anon` role, so RLS is the only thing standing between a guest
 * and the database. Guests can insert photos into an open event and nothing
 * else — reads go through the `event_by_slug` / `event_photos` RPCs, because
 * the tables themselves return nothing to `anon` by design.
 */
export function createClient() {
  const { url, anonKey } = publicSupabaseEnv()
  return createBrowserClient<Database>(url, anonKey)
}
