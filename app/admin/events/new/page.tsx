import { formatEventLocalInput } from '@/lib/format'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { NewEventForm } from './new-event-form'

// The suggested deadline is computed from the clock, so this page cannot be
// prerendered — a build-time default would go stale the day after a deploy.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Új esemény — OurFilm',
  robots: { index: false, follow: false },
}

/** A week out, end of day. Hosts create the event to print the QR-kód, which
 *  happens days before the party rather than at it, so "tonight" would be the
 *  wrong guess far more often than this is. It is a starting point for the
 *  picker, not a recommendation — every host is expected to move it. */
const SUGGESTED_DAYS = 7

export default function NewEventPage() {
  const now = new Date()
  const week = new Date(now.getTime() + SUGGESTED_DAYS * 24 * 60 * 60 * 1000)
  // Both rendered on the server, in the event's zone, and handed down as
  // props: computing them in the client component instead would either flash
  // an empty field until hydration or mismatch the server's markup.
  const suggested = `${formatEventLocalInput(week).slice(0, 10)}T23:59`

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-10 sm:py-16">
      <Link
        href="/admin"
        className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Eseményeid
      </Link>
      <h1 className="mt-6 mb-8 text-3xl font-semibold tracking-tight">
        Új esemény
      </h1>
      <NewEventForm
        suggestedCloses={suggested}
        earliestCloses={formatEventLocalInput(now)}
      />
    </main>
  )
}
