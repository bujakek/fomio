import { BackgroundGlow } from '@/components/site/background-glow'
import { Footer } from '@/components/site/footer'
import { Navbar } from '@/components/site/navbar'
import type { ReactNode } from 'react'

/**
 * Chrome only — no page header.
 *
 * Blog routes cannot use `PageShell`: a post is an .mdx file that renders its
 * own `# heading`, so the header has to come from the content rather than from
 * a wrapper. The index supplies its own `PageHeader` instead.
 */
export default function BlogLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <BackgroundGlow />
      <Navbar />
      <main className="relative z-10">{children}</main>
      <Footer />
    </div>
  )
}
