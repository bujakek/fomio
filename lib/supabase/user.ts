import 'server-only'

import { cache } from 'react'

import { createClient } from './server'

/**
 * The signed-in host, if any.
 *
 * Wrapped in React `cache()` so a layout, a page, and a nested Suspense child
 * that all ask "who is this?" share one Auth round trip. `getUser()` hits
 * Supabase over the network — it is not a cookie read.
 */
export const getAuthUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})
