import { BackgroundGlow } from '@/components/site/background-glow'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'

/**
 * `noindex` lives on the layout so it covers every event route — the event
 * page, upload and gallery — rather than each page remembering to set it.
 *
 * Album privacy rests entirely on the URL being unguessable, so a slug landing
 * in a search index would undo it for good. Note that `robots.ts` deliberately
 * does *not* disallow `/e/`: a crawler has to be allowed to fetch the page in
 * order to see this and drop the URL again.
 *
 * Metadata merges down the tree, so a page setting only `title` keeps this.
 */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
}

export default function EventLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <BackgroundGlow />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
