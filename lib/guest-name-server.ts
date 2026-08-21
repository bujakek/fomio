import 'server-only'

import { cookies } from 'next/headers'

import { GUEST_NAME_COOKIE } from './guest-name'

/**
 * Has this device joined, as far as the server can tell?
 *
 * The counterpart to `hasGuestName()`, reading the cookie that
 * `writeGuestName()` mirrors. Lives in its own module because it imports
 * `next/headers`, which must never be reachable from a browser bundle — the
 * rest of `guest-name.ts` is deliberately isomorphic.
 *
 * **Not access control**, and the distance is worth restating at the one place
 * a server now branches on it: a cookie is typed as easily as it is read, so
 * this decides what to *render*, never what a guest is *allowed* to see. Album
 * privacy still rests entirely on the slug being unguessable. What it does buy
 * is that the album is no longer serialised into the flight payload of a
 * visitor who has not joined — the old client-side gate hid the DOM while
 * shipping every photo path in the RSC stream behind it.
 */
export async function guestHasJoined(): Promise<boolean> {
  const store = await cookies()
  return (store.get(GUEST_NAME_COOKIE)?.value ?? '').trim() !== ''
}
