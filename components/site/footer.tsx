import { Aperture } from 'lucide-react'

const groups = [
  {
    title: 'TERMÉK',
    links: ['Hogyan működik', 'QR-kódok', 'Közös galéria', 'Letöltés'],
  },
  {
    title: 'ALKALMAK',
    links: ['Esküvő', 'Születésnap', 'Utazás', 'Buli'],
  },
  {
    title: 'TÁMOGATÁS',
    links: ['GYIK', 'Kapcsolat', 'Adatvédelem', 'ÁSZF'],
  },
  {
    title: 'CÉG',
    links: ['Rólunk', 'Blog', 'Sajtó', 'Karrier'],
  },
]

export function Footer() {
  return (
    <footer className="relative px-4 pb-10 pt-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="glass rounded-[2rem] p-8 sm:p-12">
          <div className="grid gap-10 lg:grid-cols-[1.4fr_2fr]">
            <div className="max-w-xs">
              <div className="flex items-center gap-2.5">
                <span className="glass flex size-9 items-center justify-center rounded-xl">
                  <Aperture className="size-5 text-accent" strokeWidth={1.6} />
                </span>
                <span className="text-lg font-semibold tracking-tight">
                  Fomio
                </span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Közös albumok, minden vendég szemével.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
              {groups.map((group) => (
                <div key={group.title}>
                  <h3 className="text-xs font-semibold tracking-[0.15em] text-muted-foreground">
                    {group.title}
                  </h3>
                  <ul className="mt-4 flex flex-col gap-3">
                    {group.links.map((link) => (
                      <li key={link}>
                        <a
                          href="#top"
                          className="text-sm text-foreground/80 transition-colors hover:text-foreground"
                        >
                          {link}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 border-t border-border pt-6">
            <p className="text-sm text-muted-foreground">
              © 2026 Fomio. Készült Budapesten, sok-sok fényképpel.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
