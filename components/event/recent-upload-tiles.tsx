'use client'

import { GUEST_FALLBACK_NAME } from '@/lib/guest-name'
import {
  noRecentUploads,
  recentUploads,
  subscribeToRecentUploads,
} from '@/lib/recent-uploads'
import { usePathname } from 'next/navigation'
import { useCallback, useSyncExternalStore } from 'react'

/** Roughly a phone screen of tiles at two columns. */
const SKELETON_TILES = 6

/**
 * The grid shown while the real gallery is being fetched.
 *
 * Anything this device uploaded a moment ago is drawn from the `blob:` URL
 * still held in memory, so a guest arriving from the upload screen sees their
 * own photos immediately rather than a spinner where their photos are about to
 * be. Everything else is a placeholder.
 *
 * `useSyncExternalStore` rather than an effect: the store is not React state,
 * and the server snapshot is empty, which is both true and what keeps
 * hydration quiet.
 */
export function RecentUploadTiles() {
  // `loading.tsx` takes no props, so the slug comes from the URL. The pathname
  // is `/e/{slug}/gallery` — this is the segment after `/e/`.
  const pathname = usePathname()
  const slug = pathname.split('/')[2] ?? ''

  // `subscribeToRecentUploads` is a module-level function, so it is already
  // the stable reference useSyncExternalStore needs. Only the snapshot getter
  // closes over anything.
  const getSnapshot = useCallback(() => recentUploads(slug), [slug])
  const mine = useSyncExternalStore(
    subscribeToRecentUploads,
    getSnapshot,
    noRecentUploads,
  )

  const skeletons = Math.max(SKELETON_TILES - mine.length, 0)

  return (
    <ul className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3">
      {mine.map((upload) => (
        <li key={upload.id}>
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element --
                a blob: URL has no remote source for next/image to optimise,
                and this tile is replaced the moment the real grid arrives. */}
            <img
              src={upload.previewUrl}
              alt=""
              className="size-full object-cover"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pt-6 pb-1.5 text-left"
            >
              <span className="block truncate text-[11px] font-medium text-white/90">
                {upload.uploaderName || GUEST_FALLBACK_NAME}
              </span>
            </span>
          </div>
        </li>
      ))}

      {Array.from({ length: skeletons }, (_, i) => (
        <li key={`skeleton-${i}`}>
          <div className="glass aspect-square w-full animate-pulse rounded-2xl" />
        </li>
      ))}
    </ul>
  )
}
