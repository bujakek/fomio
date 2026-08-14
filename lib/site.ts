/**
 * The canonical origin, and the single source of the URL that ends up printed
 * on a QR card.
 *
 * Defaults to production rather than the current request's host on purpose. A
 * card generated while developing must still encode `https://fomio.io/e/…`; a
 * stack of cards pointing at `localhost` is a stack of waste paper, and the
 * mistake is invisible until someone scans one at the venue.
 *
 * Override with NEXT_PUBLIC_SITE_URL only to test a scan against a deploy
 * preview or a tunnel.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fomio.io'
).replace(/\/$/, '')

export function eventUrl(slug: string) {
  return `${SITE_URL}/e/${slug}`
}
