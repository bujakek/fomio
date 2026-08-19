import { BackgroundGlow } from '@/components/site/background-glow'
import { Footer } from '@/components/site/footer'
import { Navbar } from '@/components/site/navbar'
import type { ReactNode } from 'react'

interface PageShellProps {
  /** Short uppercase section marker shown in the pill above the title. */
  eyebrow: string
  title: ReactNode
  /** One or two sentences under the title. */
  lead?: ReactNode
  children: ReactNode
}

/**
 * The frame every standalone marketing page sits in — the same glow, nav and
 * footer as the homepage, plus the standard header rhythm.
 *
 * `pt-32` clears the fixed nav pill; the homepage gets away without it because
 * the hero is built to sit under the nav, and these pages are not.
 */
export function PageShell({ eyebrow, title, lead, children }: PageShellProps) {
  return (
    <div className="relative min-h-screen">
      <BackgroundGlow />
      <Navbar />
      <main className="relative z-10">
        <section className="relative px-4 pt-32 pb-10 sm:px-6 sm:pt-40 sm:pb-14">
          <div className="mx-auto max-w-3xl">
            <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium tracking-wide text-accent">
              {eyebrow}
            </span>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              {title}
            </h1>
            {lead ? (
              <p className="mt-5 text-lg leading-relaxed text-pretty text-muted-foreground">
                {lead}
              </p>
            ) : null}
          </div>
        </section>
        {children}
      </main>
      <Footer />
    </div>
  )
}
