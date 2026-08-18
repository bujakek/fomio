import { Aperture } from 'lucide-react'

const links = [
  { label: 'Hogyan működik', href: '#how-it-works' },
  { label: 'Alkalmak', href: '#occasions' },
  { label: 'Vélemények', href: '#testimonials' },
  { label: 'GYIK', href: '#faq' },
]

export function Footer() {
  return (
    <footer className="relative px-4 pt-16 pb-10 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="glass rounded-[2rem] p-8 sm:p-12">
          <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-xs">
              <div className="flex items-center gap-2.5">
                <span className="glass flex size-9 items-center justify-center rounded-xl">
                  <Aperture className="size-5 text-accent" strokeWidth={1.6} />
                </span>
                <span className="text-lg font-semibold tracking-tight">
                  OurFilm
                </span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Közös albumok, minden vendég szemével.
              </p>
            </div>

            <ul className="flex flex-col gap-3 sm:items-end">
              {links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-foreground/80 transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-12 border-t border-border pt-6">
            <p className="text-sm text-muted-foreground">
              © 2026 OurFilm. Készült Budapesten, sok-sok fényképpel.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
