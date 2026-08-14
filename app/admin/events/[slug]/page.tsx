import { QrCard } from '@/components/admin/qr-card'
import { getOwnedEventBySlug } from '@/lib/events'
import { formatEventDate } from '@/lib/format'
import { eventUrl } from '@/lib/site'
import { ArrowLeft, ExternalLink, Images, Lock } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const event = await getOwnedEventBySlug(slug)
  return {
    title: event ? `${event.event_name} — Fomio` : 'Esemény — Fomio',
    robots: { index: false, follow: false },
  }
}

export default async function AdminEventPage({ params }: Props) {
  const { slug } = await params
  const event = await getOwnedEventBySlug(slug)
  if (!event) notFound()

  const url = eventUrl(event.slug)
  const closed =
    event.uploads_close_at !== null &&
    new Date(event.uploads_close_at) <= new Date()

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-10 sm:py-16">
      <Link
        href="/admin"
        className="print-hidden inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Eseményeid
      </Link>

      <div className="print-hidden mt-6">
        <h1 className="text-3xl font-semibold tracking-tight text-balance">
          {event.event_name}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {formatEventDate(event.event_date) ?? 'Nincs dátum'}
          {closed ? ' · a feltöltés lezárult' : ''}
        </p>
      </div>

      <div className="mt-8">
        <QrCard name={event.event_name} url={url} />
      </div>

      <div className="print-hidden mt-8 flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Ezt a linket olvassák be a vendégek:
        </p>
        <code className="glass truncate rounded-xl px-4 py-3 text-sm text-accent">
          {url}
        </code>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/e/${event.slug}`}
            className="glass glass-hover inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold"
          >
            <ExternalLink className="size-4" />
            Vendégnézet
          </Link>
          <Link
            href={`/e/${event.slug}/gallery`}
            className="glass glass-hover inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold"
          >
            <Images className="size-4" />
            Galéria
          </Link>
        </div>
        {event.gallery_hidden_at ? (
          <p className="glass mt-2 flex items-center gap-2 rounded-2xl px-5 py-3 text-sm text-muted-foreground">
            <Lock className="size-4 shrink-0" />A galéria jelenleg rejtve van a
            vendégek elől.
          </p>
        ) : null}
      </div>
    </main>
  )
}
