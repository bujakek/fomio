import { OCCASIONS_ARE_DRAFT, occasions } from '@/lib/occasions'
import { SITE_URL } from '@/lib/site'
import type { MetadataRoute } from 'next'

/**
 * Only pages we actually want indexed.
 *
 * Event routes must never appear here. A sitemap is a public, machine-readable
 * list of every URL worth visiting — publishing album addresses in one would
 * hand away the only thing keeping them private, and would undo the random
 * slug suffix entirely. Nothing under /e/ or /admin ever belongs here.
 *
 * The draft marketing pages are excluded for a different reason: /arak,
 * /rolunk, /kapcsolat, /adatvedelem and /aszf all still carry
 * `robots.index: false`, and listing a noindex URL in a sitemap sends crawlers
 * two contradictory instructions. Add each one here in the same change that
 * removes its noindex and its DraftNotice.
 *
 * The occasion routes need no such bookkeeping: they come and go with
 * `OCCASIONS_ARE_DRAFT`, which is the same flag their pages read.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const marketing: MetadataRoute.Sitemap = OCCASIONS_ARE_DRAFT
    ? []
    : [
        {
          url: `${SITE_URL}/alkalmak`,
          changeFrequency: 'monthly',
          priority: 0.8,
        },
        ...occasions.map((occasion) => ({
          url: `${SITE_URL}/alkalmak/${occasion.slug}`,
          changeFrequency: 'monthly' as const,
          priority: 0.7,
        })),
      ]

  return [
    {
      url: SITE_URL,
      changeFrequency: 'monthly',
      priority: 1,
    },
    ...marketing,
  ]
}
