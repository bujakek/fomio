'use client'

import { cn } from '@/lib/utils'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Reveal } from './reveal'

const faqs = [
  {
    q: 'Kell a vendégeknek alkalmazást letölteniük?',
    a: 'Nem. A QR-kód beolvasása után a telefon böngészője megnyitja a feltöltő oldalt, és onnan azonnal küldhetik a képeket.',
  },
  {
    q: 'Regisztrálniuk kell a vendégeknek?',
    a: 'Nem. A vendégek név, e-mail-cím és fiók létrehozása nélkül tölthetik fel a képeiket.',
  },
  {
    q: 'Ki láthatja a feltöltött képeket?',
    a: 'Az albumot csak azok érhetik el, akik megkapták az esemény QR-kódját vagy meghívólinkjét. Az album nem nyilvános, és nem jelenik meg a keresőkben.',
  },
  {
    q: 'Eredeti minőségben érkeznek a fotók?',
    a: 'Igen. A képeket nem tömörítjük le, így az eredeti felbontásban tölthetők le és nyomtathatók ki.',
  },
  {
    q: 'Meddig érhetők el a képek?',
    a: 'A képek az eseményhez tartozó megőrzési idő végéig érhetők el. A pontos időtartamot az eseménycsomag tartalmazza, és lejárat előtt értesítést küldünk.',
  },
  {
    q: 'Moderálhatom, mi kerül az albumba?',
    a: 'Igen. Házigazdaként elrejtheted vagy törölheted a nem kívánt képeket, és szabályozhatod, hogy a vendégek láthatják-e egymás feltöltéseit.',
  },
  {
    q: 'Mi történik, ha gyenge a wifi a helyszínen?',
    a: 'A feltöltés gyenge kapcsolat esetén is folytatódik. Ha a kapcsolat megszakad, a rendszer később automatikusan újrapróbálhatja a feltöltést.',
  },
  {
    q: 'Hogyan kezelitek az adatokat?',
    a: 'A fotókat kizárólag az album működtetéséhez tároljuk. Nem adjuk el őket, és nem használjuk fel hirdetési célokra. A házigazda bármikor véglegesen törölheti az eseményt és annak tartalmát.',
  },
]

export function Faq() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="gyik" className="relative px-4 py-24 sm:px-6 lg:py-32">
      <div className="mx-auto max-w-3xl">
        <Reveal className="text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Gyakori kérdések
          </h2>
        </Reveal>

        <Reveal className="mt-12" delay={80}>
          <ul className="flex flex-col gap-3">
            {faqs.map((item, i) => {
              const isOpen = open === i
              const panelId = `faq-panel-${i}`
              const buttonId = `faq-button-${i}`
              return (
                <li key={item.q} className="glass overflow-hidden rounded-2xl">
                  <h3>
                    <button
                      type="button"
                      id={buttonId}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpen(isOpen ? null : i)}
                      className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                    >
                      <span className="text-base font-medium sm:text-lg">
                        {item.q}
                      </span>
                      <Plus
                        className={cn(
                          'size-5 shrink-0 text-accent transition-transform duration-300',
                          isOpen && 'rotate-45',
                        )}
                      />
                    </button>
                  </h3>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    className={cn(
                      'grid transition-all duration-400 ease-out',
                      isOpen
                        ? 'grid-rows-[1fr] opacity-100'
                        : 'grid-rows-[0fr] opacity-0',
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="px-6 pb-6 text-pretty text-sm leading-relaxed text-muted-foreground">
                        {item.a}
                      </p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </Reveal>
      </div>
    </section>
  )
}
