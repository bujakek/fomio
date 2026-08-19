import { getDemoAlbumPreview } from '@/lib/demo'
import { DEMO_EVENT_SLUG, demoEventUrl } from '@/lib/site'
import { DemoAlbum } from './demo-album'
import { LiveDemoFallback } from './live-demo-fallback'

/**
 * The "try it" section, backed by the real sample album when there is one.
 *
 * A Server Component so the album is read at build/revalidate time rather than
 * from the browser — see `lib/demo.ts` for why it deliberately avoids the
 * cookie-reading Supabase client, and `app/page.tsx` for the revalidate window
 * that keeps this fresh.
 *
 * Falls back to the hardcoded simulation when the album cannot be read: an
 * unseeded database, or Supabase being briefly unreachable. The marketing
 * homepage must not go down because a demo row is missing.
 */
export async function LiveDemo() {
  const preview = await getDemoAlbumPreview()

  if (!preview) return <LiveDemoFallback />

  return (
    <DemoAlbum
      preview={preview}
      url={demoEventUrl()}
      href={`/e/${DEMO_EVENT_SLUG}`}
    />
  )
}
