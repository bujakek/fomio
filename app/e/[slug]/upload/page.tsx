import { UploadQueue } from '@/components/event/upload-queue'
import { getEventBySlug, uploadsAreOpen } from '@/lib/events'
import { ArrowLeft, Lock } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const event = await getEventBySlug(slug)
  return event ? { title: `Feltöltés — ${event.event_name}` } : {}
}

export default async function UploadPage({ params }: Props) {
  const { slug } = await params
  const event = await getEventBySlug(slug)
  if (!event) notFound()

  const canUpload = uploadsAreOpen(event)

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-4 py-10 sm:py-16">
      <Link
        href={`/e/${event.slug}`}
        className="inline-flex min-h-11 items-center gap-2 self-start text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {event.event_name}
      </Link>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-balance">
        Képek feltöltése
      </h1>

      {canUpload ? (
        <>
          <p className="mt-3 leading-relaxed text-pretty text-muted-foreground">
            Válaszd ki a képeket a telefonodról. Egyszerre többet is
            kijelölhetsz — mi lekicsinyítjük őket, hogy gyenge wifin is
            felmenjenek.
          </p>
          <div className="mt-8">
            <UploadQueue
              eventId={event.id}
              slug={event.slug}
              galleryPrivate={event.gallery_private}
            />
          </div>
        </>
      ) : (
        // The database refuses these uploads regardless; this is so a guest
        // who kept the link open, or typed the URL directly, gets told why
        // instead of watching every file fail.
        <div className="mt-8 flex flex-col gap-4">
          <p className="glass flex min-h-14 items-center justify-center gap-2 rounded-2xl px-6 text-center text-sm text-muted-foreground">
            <Lock className="size-4 shrink-0" strokeWidth={1.8} />A feltöltés
            lezárult
          </p>
          <p className="text-center text-sm leading-relaxed text-pretty text-muted-foreground">
            Erre az eseményre már nem lehet képet feltölteni, de az album
            megmarad.
          </p>
        </div>
      )}
    </main>
  )
}
