import { SITE_URL } from '@/lib/site'
import type { MetadataRoute } from 'next'

/**
 * The marketing homepage, and nothing else.
 *
 * Event routes must never appear here. A sitemap is a public, machine-readable
 * list of every URL worth visiting — publishing album addresses in one would
 * hand away the only thing keeping them private, and would undo the random
 * slug suffix entirely. If marketing pages get added later they belong here;
 * anything under /e/ or /admin never does.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      changeFrequency: 'monthly',
      priority: 1,
    },
  ]
}
