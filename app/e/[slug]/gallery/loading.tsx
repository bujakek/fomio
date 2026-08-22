import { RecentUploadTiles } from '@/components/event/recent-upload-tiles'

/**
 * The gallery's own loading state, replacing the bare spinner it inherited
 * from `/e/[slug]`.
 *
 * This file is doing more work than it looks. Next partially prefetches a
 * dynamic route only when it has a `loading.tsx`, so this is what makes the
 * tap on "Közös album megtekintése" navigate immediately instead of hanging on
 * the server. Shaping it like the page it precedes is what stops that
 * immediacy reading as a flash of something else, and `RecentUploadTiles`
 * fills the grid with the guest's own photos while the real list is on its way.
 *
 * The header is inert on purpose — the back link needs a slug and `loading.tsx`
 * receives no params. It is on screen for a moment and replaced by the real
 * one, so a placeholder is honest; a link to the wrong place would not be.
 */
export default function GalleryLoading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-10 sm:py-16">
      <div className="skeleton h-5 w-32 animate-pulse rounded-full" />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-balance">
          Közös album
        </h1>
        <div className="flex items-center gap-2">
          <div className="skeleton size-11 animate-pulse rounded-full" />
          <div className="skeleton size-11 animate-pulse rounded-full" />
        </div>
      </div>

      <RecentUploadTiles />
    </main>
  )
}
