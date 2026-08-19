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
    a: 'Fiókot nem kell létrehozniuk, és e-mail-címet sem kérünk. Egyetlen dolgot kérünk tőlük: a nevüket, hogy a képeik alatt lássátok, kitől érkeztek.',
  },
  {
    q: 'Ki láthatja a feltöltött képeket?',
    a: 'Az albumot csak azok érhetik el, akik megkapták az esemény QR-kódját vagy meghívólinkjét. Az album nem nyilvános, és nem jelenik meg a keresőkben.',
  },
  {
    q: 'Milyen minőségben érkeznek a fotók?',
    a: 'Nyomtatható minőségben. Nagyíthatók, vághatók, és szépen mutatnak papíron — nem úgy, mint a csevegőappokban.',
  },
  {
    q: 'Meddig érhetők el a képek?',
    a: 'A galéria az esemény után is elérhető marad, így a házigazda ráérősen letöltheti az egész albumot. Az esemény tartalmát a házigazda bármikor véglegesen törölheti.',
  },
  {
    q: 'Moderálhatom, mi kerül az albumba?',
    a: 'Igen. Házigazdaként elrejtheted vagy törölheted a nem kívánt képeket.',
  },
  {
    q: 'Hogyan kezelitek az adatokat?',
    a: 'A fotókat kizárólag az album működtetéséhez tároljuk. Nem adjuk el őket, és nem használjuk fel hirdetési célokra. A házigazda bármikor véglegesen törölheti az eseményt és annak tartalmát.',
  },
]

export function Faq() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="relative px-4 py-24 sm:px-6 lg:py-32">
      <div className="mx-auto max-w-3xl">
        <Reveal className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
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
                        aria-hidden="true"
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
                      <p className="px-6 pb-6 text-sm leading-relaxed text-pretty text-muted-foreground">
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
