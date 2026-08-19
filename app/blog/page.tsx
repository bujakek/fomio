import { DraftNotice } from '@/components/site/draft-notice'
import { PageHeader } from '@/components/site/page-header'
import { BLOG_IS_DRAFT, posts } from '@/lib/blog'
import { formatEventDate } from '@/lib/format'
import { ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Blog — OurFilm',
  description:
    'Gyakorlati tippek eseményekhez: QR-kód elhelyezés, fotóminőség, és hogyan gyűjts össze minden képet egy helyre.',
  ...(BLOG_IS_DRAFT ? { robots: { index: false, follow: true } } : {}),
}

export default function BlogPage() {
  return (
    <>
      <PageHeader
        eyebrow="BLOG"
        title="Gyakorlati tippek eseményekhez"
        lead="Rövid írások arról, hogyan gyűjthető össze egy nap összes fotója — a QR-kód elhelyezésétől a nyomtatható minőségig."
      />

      <section className="relative px-4 pb-24 sm:px-6 lg:pb-32">
        <div className="mx-auto max-w-3xl">
          {BLOG_IS_DRAFT ? (
            <DraftNotice>
              <strong className="font-semibold text-foreground">
                A blog még vázlat.
              </strong>{' '}
              A szerkezet kész, és egy helykitöltő bejegyzés mutatja, hogyan néz
              ki egy írás. Egyelőre nem jelenik meg a keresőkben.
            </DraftNotice>
          ) : null}

          {posts.length === 0 ? (
            <p className="mt-12 leading-relaxed text-muted-foreground">
              Még nincs bejegyzés. Hamarosan.
            </p>
          ) : (
            <ul className="mt-12 space-y-4">
              {posts.map((post) => (
                <li key={post.slug}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="glass glass-hover group flex flex-col rounded-3xl p-7"
                  >
                    <time
                      dateTime={post.date}
                      className="text-xs tracking-wide text-muted-foreground"
                    >
                      {formatEventDate(post.date)}
                    </time>
                    <h2 className="mt-3 text-xl font-semibold text-balance">
                      {post.title}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-pretty text-muted-foreground">
                      {post.description}
                    </p>
                    <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-accent">
                      Elolvasom
                      <ArrowRight
                        className="size-4 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  )
}
