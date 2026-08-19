/**
 * The post registry.
 *
 * Deliberately hand-maintained rather than derived from the filesystem: MDX
 * pages carry no index, and `@types/mdx` does not type named exports, so
 * importing a `meta` out of each post would mean fighting the type system for
 * a list that currently has one entry in it.
 *
 * **Adding a post is two steps**, and they must happen together:
 *   1. `app/blog/(posts)/<slug>/page.mdx`
 *   2. an entry here with the same slug
 * A slug listed here with no file 404s from the index; a file with no entry is
 * reachable but invisible.
 */
export interface BlogPost {
  slug: string
  title: string
  description: string
  /** ISO date, used for sorting and display. */
  date: string
}

/**
 * While true, /blog and every post render a draft banner and `noindex`, and
 * stay out of `app/sitemap.ts`. Same pattern as `OCCASIONS_ARE_DRAFT`.
 */
export const BLOG_IS_DRAFT = true

export const posts: BlogPost[] = [
  {
    slug: 'qr-kod-az-asztalokon',
    title: 'Hova tedd a QR-kódot az esküvőn',
    description:
      'Hol veszik észre a vendégek a kódot, és hol nem — gyakorlati elhelyezés a helyszínen.',
    date: '2026-08-19',
  },
].sort((a, b) => b.date.localeCompare(a.date))
