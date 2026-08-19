import { JoinGate } from '@/components/event/join-gate'
import { BackgroundGlow } from '@/components/site/background-glow'
import { getEventBySlug } from '@/lib/events'
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

export default async function EventLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  // React-cached, so this shares the page's lookup rather than adding a
  // round trip. A missing event falls through ungated so the page can 404 —
  // gating a 404 would tell a stranger the slug was worth guessing again.
  const event = await getEventBySlug(slug)

  return (
    <div className="relative min-h-screen">
      <BackgroundGlow />
      <div className="relative z-10">
        {event ? (
          <JoinGate eventName={event.event_name}>{children}</JoinGate>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
