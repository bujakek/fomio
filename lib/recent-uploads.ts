import 'client-only'

/**
 * What this device has just put into an album, held in memory so the gallery
 * can show it before the server has been asked.
 *
 * The gallery is a dynamic route: tapping through to it costs a render and a
 * query, and Next fills that gap with `loading.tsx`. A guest who has just
 * uploaded therefore watches a spinner sitting where their own photos are
 * about to appear — photos whose pixels are already decoded and sitting in
 * this tab. This store hands them to the loading state instead.
 *
 * **Only successful uploads go in.** A photo is recorded once its row is
 * committed, which means everything here is genuinely in the album and the
 * real grid will show the same set a moment later. Recording optimistically at
 * queue time would be the version that flickers: a guest who navigated
 * mid-queue would see photos appear and then vanish as the server's answer
 * arrived without them.
 *
 * Module state, so it lives exactly as long as the tab's navigation session —
 * it survives the client-side transition into the gallery, and a real reload
 * drops it, which is correct. Nothing here is a cache; the server list is
 * always the truth, and this is only ever shown while waiting for it.
 */

export type RecentUpload = {
  /** The id minted by `uploadPhoto`, so React can key it. */
  id: string
  /** `blob:` URL of the guest's original file — already decoded by the tab. */
  previewUrl: string
  uploaderName: string | null
}

/**
 * Enough to fill the top of a grid and no more. These hold object URLs, which
 * pin the underlying file in memory until revoked, and a guest who uploads
 * eighty photos at a wedding should not be carrying eighty originals around
 * for the rest of the evening.
 */
const LIMIT = 12

const bySlug = new Map<string, RecentUpload[]>()
const listeners = new Set<() => void>()

/** Stable identity for "nothing yet". `useSyncExternalStore` compares
 *  snapshots by reference and re-renders forever if handed a fresh `[]`. */
const EMPTY: readonly RecentUpload[] = []

export function rememberUpload(slug: string, upload: RecentUpload) {
  const next = [upload, ...(bySlug.get(slug) ?? [])]

  // Evicted entries own their object URL and nothing else will free it.
  next.slice(LIMIT).forEach((u) => URL.revokeObjectURL(u.previewUrl))

  bySlug.set(slug, next.slice(0, LIMIT))
  listeners.forEach((notify) => notify())
}

/** Same array reference until `rememberUpload` replaces it — see EMPTY. */
export function recentUploads(slug: string): readonly RecentUpload[] {
  return bySlug.get(slug) ?? EMPTY
}

/** Server render and hydration both see nothing, which is the truth there. */
export function noRecentUploads(): readonly RecentUpload[] {
  return EMPTY
}

export function subscribeToRecentUploads(notify: () => void) {
  listeners.add(notify)
  return () => {
    listeners.delete(notify)
  }
}
