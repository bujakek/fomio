import { BillingCard } from '@/components/admin/billing-card'
import { DangerZone } from '@/components/admin/danger-zone'
import { GalleryToggle } from '@/components/admin/gallery-toggle'
import { ModerationGrid } from '@/components/admin/moderation-grid'
import { QrCard } from '@/components/admin/qr-card'
import { ModerationGridSkeleton } from '@/components/admin/skeletons'
import {
  type EventQuota,
  formatAmount,
  getEventPurchase,
  getEventQuota,
  type Purchase,
} from '@/lib/billing'
import { getOwnedEventBySlug } from '@/lib/events'
import { getAllEventPhotos } from '@/lib/photos'
import { formatEventDate, formatMoment } from '@/lib/format'
import { eventUrl } from '@/lib/site'
import { stripeIsConfigured } from '@/lib/stripe/env'
import { ArrowLeft, Download, ExternalLink, Images } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ checkout?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const event = await getOwnedEventBySlug(slug)
  return {
    title: event ? `${event.event_name} — OurFilm` : 'Esemény — OurFilm',
    robots: { index: false, follow: false },
  }
}

export default async function AdminEventPage({ params, searchParams }: Props) {
  const { slug } = await params
  const event = await getOwnedEventBySlug(slug)
  if (!event) notFound()

  // Only the two values Stripe is sent back with are honoured. Anything else
  // in the query string is somebody typing, and a "payment succeeded" banner
  // is not something a URL should be able to conjure.
  const { checkout } = await searchParams
  const checkoutState =
    checkout === 'success' || checkout === 'cancelled' ? checkout : null

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
      </div>

      <div className="print-hidden mt-8">
        <GalleryToggle
          slug={event.slug}
          hidden={event.gallery_hidden_at !== null}
        />
      </div>

      <div className="print-hidden mt-4">
        <Suspense fallback={<BillingCardSkeleton />}>
          <EventBilling
            slug={event.slug}
            eventId={event.id}
            checkout={checkoutState}
          />
        </Suspense>
      </div>

      <section className="print-hidden mt-10">
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Képek</h2>
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          Az elrejtett képek eltűnnek a galériából, de nem vesznek el — bármikor
          visszaállíthatod őket.
        </p>
        <Suspense fallback={<ModerationGridSkeleton />}>
          <EventPhotos slug={event.slug} eventId={event.id} />
        </Suspense>
      </section>

      <section className="print-hidden mt-10">
        <h2 className="mb-3 text-lg font-semibold tracking-tight">
          Album letöltése
        </h2>
        <Suspense fallback={<AlbumDownloadSkeleton />}>
          <AlbumDownload slug={event.slug} eventId={event.id} />
        </Suspense>
      </section>

      <Suspense fallback={null}>
        <EventDangerZone
          slug={event.slug}
          eventName={event.event_name}
          eventId={event.id}
        />
      </Suspense>
    </main>
  )
}

function BillingCardSkeleton() {
  return (
    <div
      className="skeleton h-32 animate-pulse rounded-2xl"
      aria-hidden="true"
    />
  )
}

async function EventBilling({
  slug,
  eventId,
  checkout,
}: {
  slug: string
  eventId: string
  checkout: 'success' | 'cancelled' | null
}) {
  // Contained on purpose. This section sits on the same page as the QR card,
  // which is the single most valuable thing in the admin area — a billing
  // read that throws would take the whole route to the error boundary and
  // leave a host unable to reach the code they are about to print. Before the
  // billing migrations are pushed this is not hypothetical: the table and the
  // RPC do not exist yet.
  let quota: EventQuota
  let purchase: Purchase | null
  try {
    ;[quota, purchase] = await Promise.all([
      getEventQuota(eventId),
      getEventPurchase(eventId),
    ])
  } catch (e) {
    console.error('Could not read billing state', e)
    return (
      <div className="glass rounded-2xl px-5 py-4">
        <p className="font-medium">Feltöltési keret</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Most nem tudjuk lekérdezni. Az album és a feltöltés ettől
          változatlanul működik.
        </p>
      </div>
    )
  }

  // Only shown when a payment is what lifted the cap. An admin-owned event is
  // also unlimited and has no receipt to show, and inventing one would be a
  // lie in the one place a host looks to check they were charged correctly.
  const receipt =
    purchase?.status === 'paid'
      ? [
          formatAmount(purchase.amount_minor, purchase.currency),
          purchase.paid_at ? formatMoment(purchase.paid_at) : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : ''

  return (
    <BillingCard
      slug={slug}
      photoLimit={quota.photoLimit}
      remaining={quota.remaining}
      unlimited={quota.unlimited}
      paidLabel={receipt ? `Kifizetve — ${receipt}` : null}
      stripeReady={stripeIsConfigured()}
      checkout={checkout}
    />
  )
}

function AlbumDownloadSkeleton() {
  return (
    <div aria-hidden="true">
      <p className="mb-4 h-10 animate-pulse rounded-md bg-muted-foreground/15" />
      <div className="h-14 w-full animate-pulse rounded-full bg-muted-foreground/15" />
    </div>
  )
}

async function AlbumDownload({
  slug,
  eventId,
}: {
  slug: string
  eventId: string
}) {
  const photos = await getAllEventPhotos(eventId)
  const empty = photos.length === 0

  return (
    <>
      <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
        {empty
          ? 'Még nincs kép az albumban — a letöltés akkor lesz elérhető, ha a vendégek feltöltenek.'
          : 'Az összes kép eredeti méretben, egyetlen ZIP-fájlban. Az elrejtett képek külön mappába kerülnek. Nagy albumnál a letöltés indulása eltarthat egy ideig.'}
      </p>
      {empty ? (
        <button
          type="button"
          disabled
          className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-primary px-7 text-base font-semibold text-primary-foreground disabled:opacity-60"
        >
          <Download className="size-5" strokeWidth={1.8} />
          ZIP letöltése
        </button>
      ) : (
        <a
          href={`/admin/events/${slug}/export`}
          className="btn-shine inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-primary px-7 text-base font-semibold text-primary-foreground"
        >
          <Download className="size-5" strokeWidth={1.8} />
          ZIP letöltése
        </a>
      )}
    </>
  )
}

async function EventPhotos({
  slug,
  eventId,
}: {
  slug: string
  eventId: string
}) {
  const photos = await getAllEventPhotos(eventId)
  return <ModerationGrid photos={photos} slug={slug} />
}

async function EventDangerZone({
  slug,
  eventName,
  eventId,
}: {
  slug: string
  eventName: string
  eventId: string
}) {
  const photos = await getAllEventPhotos(eventId)
  return (
    <DangerZone slug={slug} eventName={eventName} photoCount={photos.length} />
  )
}
