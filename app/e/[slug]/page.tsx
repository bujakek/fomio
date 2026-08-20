import { UploadQueue } from '@/components/event/upload-queue'
import { getEventQuotaOrNull } from '@/lib/billing'
import { getEventBySlug, uploadsAreOpen } from '@/lib/events'
import { getEventPhotos, summarisePhotos } from '@/lib/photos'
import { formatEventDate } from '@/lib/format'
import { Images, Lock } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

// A guest who has just uploaded returns here expecting their photo to count.
// Nothing on this screen is worth serving stale.
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const event = await getEventBySlug(slug)
  if (!event) return {}
  // Deliberately plain: this title can surface in a shared link preview or a
  // phone's tab list, and the event name is enough. No description, no image.
  return { title: `${event.event_name} — közös fotóalbum` }
}

export default async function EventPage({ params }: Props) {
  const { slug } = await params
  const event = await getEventBySlug(slug)
  if (!event) notFound()

  const eventDate = formatEventDate(event.event_date)
  const canUpload = uploadsAreOpen(event)

  // Costs a full row fetch for two numbers, which is the honest trade at pilot
  // scale — a dedicated count needs a `security definer` function, since
  // guests cannot read the table. Revisit if an album ever gets large enough
  // for this to show up. `event_photos` returns nothing while the gallery is
  // hidden, so skip it rather than render a confident zero.
  const summary = event.gallery_private
    ? null
    : summarisePhotos(await getEventPhotos(event.id))

  // Read here rather than inside the queue: the guest arrives on a server
  // render and the number has to be right in the first paint, otherwise the
  // pickers appear and then vanish under them on a full album.
  const quota = canUpload ? await getEventQuotaOrNull(event.id) : null

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-4 py-10 sm:py-16">
      {/* `my-auto` rather than `justify-center` on the parent: the upload
          queue grows as files are added, and a centred flex column clips the
          overflow above the fold where it cannot be scrolled to. */}
      <div className="my-auto w-full">
        <header className="text-center">
          <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium tracking-wide text-accent">
            KÖZÖS FOTÓALBUM
          </span>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {event.event_name}
          </h1>
          {eventDate ? (
            <p className="mt-3 text-sm text-muted-foreground">{eventDate}</p>
          ) : null}
          <p className="mx-auto mt-5 max-w-sm leading-relaxed text-pretty text-muted-foreground">
            {canUpload
              ? 'Töltsd fel a képeidet, hogy mindenki lássa, milyen volt a te szemeddel. App és regisztráció nélkül.'
              : 'A feltöltés lezárult, de az album megmarad — nézd meg, mi gyűlt össze.'}
          </p>
        </header>

        {/* Social proof, and a signal that the album is alive. Hidden at zero:
          "0 kép" reads as broken rather than as an empty album waiting for
          you. The contributor count is suppressed until at least one guest
          has given a name — see summarisePhotos for why it is a floor. */}
        {summary && summary.photoCount > 0 ? (
          <div className="glass mt-6 flex items-stretch justify-center divide-x divide-border rounded-2xl py-3">
            <div className="px-7 text-center">
              <p className="text-xl font-semibold tracking-tight">
                {summary.photoCount}
              </p>
              <p className="text-xs text-muted-foreground">kép</p>
            </div>
            {summary.hasNamedContributors ? (
              <div className="px-7 text-center">
                <p className="text-xl font-semibold tracking-tight">
                  {summary.contributorCount}
                </p>
                <p className="text-xs text-muted-foreground">vendég</p>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* The upload queue lives here rather than behind a navigation. Picking
          files was a three-screen trip — landing, a page whose only content
          was two buttons, then the queue — for what the OS already presents
          as a single sheet. */}
        <div className="mt-10 flex flex-col gap-3">
          {canUpload ? (
            <UploadQueue
              eventId={event.id}
              slug={event.slug}
              galleryPrivate={event.gallery_private}
              remaining={quota?.remaining ?? null}
            />
          ) : (
            <p className="glass flex min-h-14 items-center justify-center gap-2 rounded-full px-6 text-center text-sm text-muted-foreground">
              <Lock className="size-4 shrink-0" strokeWidth={1.8} />A feltöltés
              lezárult
            </p>
          )}

          {event.gallery_private ? (
            // Say why. An empty gallery reads as "nobody bothered", which is a
            // miserable thing to tell a guest who just uploaded.
            <p className="glass rounded-2xl px-6 py-4 text-center text-sm leading-relaxed text-muted-foreground">
              A közös albumot a házigazda egyelőre elrejtette. A képeid
              megérkeztek — akkor lesznek láthatók, amikor újra megnyitja.
            </p>
          ) : (
            <Link
              href={`/e/${event.slug}/gallery`}
              className="glass glass-hover inline-flex min-h-14 items-center justify-center gap-2 rounded-full px-7 text-base font-semibold text-foreground"
            >
              <Images className="size-5" strokeWidth={1.8} />
              Közös album megtekintése
            </Link>
          )}
        </div>
      </div>
    </main>
  )
}
