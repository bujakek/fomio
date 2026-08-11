import { Quote, Star } from 'lucide-react'
import { Reveal } from './reveal'

const reviews = [
  {
    name: 'Anna és Péter',
    date: '2025. augusztus',
    monogram: 'AP',
    quote:
      'A fotósunk képeire hat hetet vártunk. A vendégek fotói már az esküvő éjszakáján ott voltak az albumban — ezeket néztük legtöbbet.',
  },
  {
    name: 'Kovács Réka',
    date: '2025. október',
    monogram: 'KR',
    quote:
      'Anyukám is fel tudta tölteni a képeit. Ez nálunk a legnagyobb dicséret egy alkalmazásnak, ami nem is alkalmazás.',
  },
  {
    name: 'Szabó Máté',
    date: '2026. március',
    monogram: 'SZ',
    quote:
      'Kitettük a QR-kódot minden asztalra, és estére 900 fotó jött össze. Semmit nem kellett utólag összevadásznom.',
  },
]

export function Testimonials() {
  return (
    <section id="velemenyek" className="relative px-4 py-24 sm:px-6 lg:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Amit a házigazdák mondanak
          </h2>
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className="flex" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="size-4 fill-accent text-accent" />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">4,9 / 5</span> · 2
              800+ értékelés alapján
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {reviews.map((r, i) => (
            <Reveal key={r.name} delay={i * 100}>
              <figure className="glass glass-hover flex h-full flex-col rounded-3xl p-8">
                <Quote className="size-8 text-accent/60" strokeWidth={1.4} />
                <blockquote className="mt-5 flex-1 text-lg leading-relaxed text-pretty text-foreground/90">
                  {`„${r.quote}”`}
                </blockquote>
                <figcaption className="mt-7 flex items-center gap-3 border-t border-border pt-5">
                  <span className="flex size-11 items-center justify-center rounded-full bg-gradient-to-br from-accent/30 to-accent-blue/30 text-sm font-semibold text-foreground ring-1 ring-border-strong ring-inset">
                    {r.monogram}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">
                      {r.name}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {r.date}
                    </span>
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
