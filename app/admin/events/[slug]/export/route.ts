import { getOwnedEventBySlug } from '@/lib/events'
import { getAllEventPhotos } from '@/lib/photos'
import { photoPublicUrl } from '@/lib/storage'
import { downloadZip } from 'client-zip'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
// Node, not Edge: an album runs to hundreds of megabytes and Edge caps how
// long a response may stream far more tightly.
export const runtime = 'nodejs'

/**
 * Streams the whole album as a ZIP — the "download everything" the landing page
 * promises the couple.
 *
 * Notably this does **not** use the service-role key, which the Supabase skill
 * originally called for. That advice assumed the export had to bypass RLS. It
 * does not: the bucket is public so objects fetch without credentials, and the
 * host's own session already reads exactly their own rows. Keeping the service
 * key out of a path that streams user data is worth the sentence of
 * explanation. `getOwnedEventBySlug` returning null *is* the ownership check —
 * RLS makes "not yours" and "does not exist" the same answer.
 *
 * Files stream from storage straight into the archive, so memory stays flat
 * whatever the album weighs. Buffering it (JSZip and friends) would run a
 * serverless function out of memory on a real wedding.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  const event = await getOwnedEventBySlug(slug)
  if (!event) return new NextResponse('Nincs ilyen esemény', { status: 404 })

  const photos = await getAllEventPhotos(event.id)
  if (photos.length === 0) {
    return new NextResponse('Ehhez az eseményhez még nincs kép', {
      status: 404,
    })
  }

  // Oldest first, so the numbering follows the order the night happened in.
  const ordered = [...photos].reverse()
  const missing: string[] = []

  // An async generator rather than an array of promises: client-zip pulls one
  // entry at a time, so exactly one object is in flight at any moment. Kicking
  // off 500 fetches up front would open 500 connections and defeat the point of
  // streaming.
  async function* entries() {
    for (const [index, photo] of ordered.entries()) {
      const n = String(index + 1).padStart(3, '0')
      const who = photo.uploader_name
        ? `-${photo.uploader_name.replace(/[^\p{L}\p{N}]+/gu, '-')}`
        : ''
      // Hidden photos ship too, but in their own folder: the host keeps
      // everything without a moderated shot turning up among the rest.
      const folder = photo.hidden_at ? 'rejtett/' : ''
      const name = `${folder}${n}${who}.jpg`

      const response = await fetch(photoPublicUrl(photo.storage_path))
      if (!response.ok || !response.body) {
        // Aborting here would truncate an archive the host is already
        // downloading. Skip, and account for it at the end instead.
        missing.push(`${name} (${photo.storage_path})`)
        continue
      }

      yield { name, lastModified: new Date(photo.created_at), input: response }
    }

    // Silent data loss is the thing to avoid: if anything was skipped, the ZIP
    // says so rather than just being quietly short.
    if (missing.length > 0) {
      yield {
        name: 'HIANYZO-KEPEK.txt',
        lastModified: new Date(),
        input:
          'Ezeket a képeket nem sikerült letölteni a tárhelyről:\n\n' +
          missing.join('\n') +
          '\n',
      }
    }
  }

  // No Content-Length on purpose. It would need the exact compressed size of
  // every entry, and `byte_size` is what the browser reported at upload rather
  // than a measurement of the stored object. A Content-Length that is wrong by
  // even one byte truncates the download — a silently corrupt archive is a far
  // worse outcome than a progress bar that spins.
  return new NextResponse(downloadZip(entries()).body, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${event.slug}-fomio.zip"`,
      'Cache-Control': 'no-store',
    },
  })
}
