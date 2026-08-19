import { DraftNotice } from '@/components/site/draft-notice'
import { BLOG_IS_DRAFT } from '@/lib/blog'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

/**
 * The reading column for a post.
 *
 * A route group, so it wraps every post without adding a `/posts` segment and
 * without wrapping the index, which needs a wider container for its grid.
 */
export default function PostLayout({ children }: { children: ReactNode }) {
  return (
    <article className="relative px-4 pt-32 pb-24 sm:px-6 sm:pt-40 lg:pb-32">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/blog"
          className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Minden bejegyzés
        </Link>

        {BLOG_IS_DRAFT ? (
          <div className="mt-6">
            <DraftNotice>
              <strong className="font-semibold text-foreground">
                Ez a bejegyzés még vázlat.
              </strong>{' '}
              A „TODO” jelölésű részeket kell valódi tartalomra cserélni. Az
              oldal egyelőre nem jelenik meg a keresőkben.
            </DraftNotice>
          </div>
        ) : null}

        {children}
      </div>
    </article>
  )
}
