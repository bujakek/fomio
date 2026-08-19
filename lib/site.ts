/**
 * The canonical origin, and the single source of the URL that ends up printed
 * on a QR card.
 *
 * Defaults to production rather than the current request's host on purpose. A
 * card generated while developing must still encode `https://ourfilm.app/e/…`; a
 * stack of cards pointing at `localhost` is a stack of waste paper, and the
 * mistake is invisible until someone scans one at the venue.
 *
 * Override with NEXT_PUBLIC_SITE_URL only to test a scan against a deploy
 * preview or a tunnel.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ourfilm.app'
).replace(/\/$/, '')

export function eventUrl(slug: string) {
  return `${SITE_URL}/e/${slug}`
}

/** Origin without the scheme, for places that show the URL rather than link it
 *  (the printed card, the landing page's mockups). */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, '')

/**
 * PLACEHOLDER — the public contact address shown on /kapcsolat and in the
 * footer. Nothing verifies that this mailbox exists; confirm it (or replace it)
 * before the pages are indexed.
 */
export const CONTACT_EMAIL = 'hello@ourfilm.app'

/**
 * The public sample album linked from the landing page.
 *
 * A fixed slug, deliberately breaking the rule `generateEventSlug()` enforces
 * for every real event. That rule exists because the URL is the only lock on a
 * private album — this album is meant to be found, so the lock is the thing we
 * do not want. `scripts/seed-demo.ts` imports this constant rather than
 * hardcoding its own copy, so the page and the row cannot drift apart.
 *
 * Seeded with uploads closed: a writable album linked from the homepage is
 * exactly the anonymous-upload exposure backlog item 6.6 is still open about.
 */
export const DEMO_EVENT_SLUG = 'bemutato-album'

/** Absolute URL of the sample album — what the landing page's QR encodes. */
export function demoEventUrl() {
  return eventUrl(DEMO_EVENT_SLUG)
}
