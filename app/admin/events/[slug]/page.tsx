import { DangerZone } from '@/components/admin/danger-zone'
import { GalleryToggle } from '@/components/admin/gallery-toggle'
import { ModerationGrid } from '@/components/admin/moderation-grid'
import { QrCard } from '@/components/admin/qr-card'
import { getOwnedEventBySlug } from '@/lib/events'
import { getAllEventPhotos } from '@/lib/photos'
import { formatEventDate } from '@/lib/format'
import { eventUrl } from '@/lib/site'
import { ArrowLeft, Download, ExternalLink, Images } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const event = await getOwnedEventBySlug(slug)
  return {
    title: event ? `${event.event_name} — OurFilm` : 'Esemény — OurFilm',
    robots: { index: false, follow: false },
  }
}

export default async function AdminEventPage({ params }: Props) {
  const { slug } = await params
  const event = await getOwnedEventBySlug(slug)
  if (!event) notFound()

  const photos = await getAllEventPhotos(event.id)
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

      {/* What the QR actually opens.
          The card shows the address; this shows the destination. A wrong date
          or a name that reads badly is invisible on a QR code and obvious here
          — and by the time cards are printed it is too late to notice.
          A live iframe rather than a mock, so it cannot drift from the real
          page: it is the same public URL a guest gets. */}
      <section className="print-hidden mt-10">
        <h2 className="mb-1 text-lg font-semibold tracking-tight">
          Amit a vendégek látnak
        </h2>
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          Ez nyílik meg a QR-kód beolvasásakor. Nyomtatás előtt érdemes ránézni.
        </p>
        <div className="glass mx-auto w-[390px] max-w-full overflow-hidden rounded-[2rem] p-2">
          <div className="h-[560px] overflow-hidden rounded-[1.6rem]">
            <iframe
              src={`/e/${event.slug}`}
              title="Vendégnézet előnézet"
              loading="lazy"
              // 390px is the phone width the guest pages are designed against;
              // scaling the frame keeps the preview honest rather than
              // rendering a squeezed desktop layout.
              className="h-[800px] w-[390px] origin-top scale-[0.7] border-0"
            />
          </div>
        </div>
      </section>

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

      <section className="print-hidden mt-10">
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Képek</h2>
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          Az elrejtett képek eltűnnek a galériából, de nem vesznek el — bármikor
          visszaállíthatod őket.
        </p>
        <ModerationGrid photos={photos} slug={event.slug} />
      </section>

      <section className="print-hidden mt-10">
        <h2 className="mb-3 text-lg font-semibold tracking-tight">
          Album letöltése
        </h2>
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          Az összes kép eredeti méretben, egyetlen ZIP-fájlban. Az elrejtett
          képek külön mappába kerülnek. Nagy albumnál a letöltés indulása
          eltarthat egy ideig.
        </p>
        <a
          href={`/admin/events/${event.slug}/export`}
          className="btn-shine inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-primary px-7 text-base font-semibold text-primary-foreground"
        >
          <Download className="size-5" strokeWidth={1.8} />
          ZIP letöltése
        </a>
      </section>

      <DangerZone
        slug={event.slug}
        eventName={event.event_name}
        photoCount={photos.length}
      />
    </main>
  )
}
