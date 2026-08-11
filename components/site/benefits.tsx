import { Download, ShieldCheck, Smartphone, Zap } from 'lucide-react'
import { Reveal } from './reveal'

const benefits = [
  {
    icon: Smartphone,
    title: 'Nincs alkalmazás',
    text: 'A vendégek az okostelefon böngészőjéből töltik fel a képeket — semmit nem kell letölteni.',
  },
  {
    icon: Zap,
    title: 'Egyből a helyén',
    text: 'A feltöltött fotó egyből bekerül a közös galériába, ahol minden vendég megnézheti.',
  },
  {
    icon: ShieldCheck,
    title: 'Privát marad',
    text: 'Az albumot csak a QR-kódot vagy meghívólinket használó vendégek érhetik el — nincs nyilvános megosztás.',
  },
  {
    icon: Download,
    title: 'Töltsd le mind',
    text: 'Egyetlen kattintással letöltheted az összes fotót egy ZIP-fájlban.',
  },
]

export function Benefits() {
  return (
    <section className="relative px-4 py-24 sm:px-6 lg:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Minden megvan, semmit nem kell megtanulni
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">
            A Fomio úgy működik, ahogy a vendégeid amúgy is használják a
            telefonjukat. Nulla súrlódás, maximális élmény.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((b, i) => (
            <Reveal key={b.title} delay={i * 90}>
              <article className="glass glass-hover flex h-full flex-col rounded-3xl p-7">
                <span className="glass flex size-12 items-center justify-center rounded-2xl">
                  <b.icon className="size-6 text-accent" strokeWidth={1.6} />
                </span>
                <h3 className="mt-6 text-lg font-semibold">{b.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {b.text}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
