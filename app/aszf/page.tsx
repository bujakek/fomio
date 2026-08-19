import { DraftNotice } from '@/components/site/draft-notice'
import {
  LegalSections,
  type LegalSection,
} from '@/components/site/legal-sections'
import { PageShell } from '@/components/site/page-shell'
import { CONTACT_EMAIL } from '@/lib/site'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ÁSZF — OurFilm',
  description:
    'Az OurFilm általános szerződési feltételei házigazdák és vendégek számára.',
  // TODO(legal): remove once a lawyer-reviewed text replaces this scaffold.
  robots: { index: false, follow: true },
}

// PLACEHOLDER — structure only. Nothing here has been reviewed, and the
// service-description bullets are the only parts grounded in the actual
// product. Do not treat this as a binding document.
const sections: LegalSection[] = [
  {
    title: 'A szolgáltató',
    body: [
      'TODO: cégnév, székhely, cégjegyzékszám, adószám, tárhelyszolgáltató adatai.',
      `Kapcsolat: ${CONTACT_EMAIL}`,
    ],
  },
  {
    title: 'Mire jó a szolgáltatás',
    body: [
      'A házigazda létrehoz egy eseményt, és kap hozzá egy QR-kódot. A vendégek beolvassák, és a telefonjuk böngészőjéből feltöltik a fotóikat egy közös albumba. A házigazda az albumot megnézheti, moderálhatja, és egyben letöltheti.',
      'A vendégeknek nem kell alkalmazást telepíteniük és nem kell regisztrálniuk.',
    ],
  },
  {
    title: 'A házigazda felelőssége',
    body: [
      'A házigazda dönti el, kivel osztja meg a QR-kódot és a linket. Aki megkapja, feltölthet és megnézheti az albumot.',
      'TODO: felelősség a feltöltött tartalomért, a vendégek tájékoztatásáért és a moderálásért.',
    ],
  },
  {
    title: 'A feltöltött tartalom',
    body: [
      'TODO: kié a fotók szerzői joga, milyen felhasználási engedélyt kapunk a tárolásukhoz és megjelenítésükhöz, és mi tiltott.',
    ],
  },
  {
    title: 'Elérhetőség és korlátozások',
    body: [
      'TODO: rendelkezésre állás, feltöltési korlátok, a szolgáltatás felfüggesztésének esetei.',
    ],
  },
  {
    title: 'Díjak és fizetés',
    body: [
      'TODO: díjszabás, számlázás, elállás és visszatérítés. Amíg nincs végleges árazás, az Árak oldal is csak illusztráció.',
    ],
  },
  {
    title: 'Felelősség és adatvesztés',
    body: [
      'TODO: felelősségkorlátozás, és annak kimondása, hogy a szolgáltatás nem helyettesíti a fotók saját biztonsági mentését.',
    ],
  },
  {
    title: 'A feltételek módosítása',
    body: ['TODO: hogyan és mennyi idővel előre értesítünk a változásokról.'],
  },
]

export default function AszfPage() {
  return (
    <PageShell
      eyebrow="ÁSZF"
      title="Általános szerződési feltételek"
      lead="Mit vállalunk, mit vársz el tőlünk, és mi az, amiért a házigazda felel."
    >
      <section className="relative px-4 pb-24 sm:px-6 lg:pb-32">
        <div className="mx-auto max-w-3xl">
          <DraftNotice>
            <strong className="font-semibold text-foreground">
              Ez a szöveg még nem végleges, és jogilag nem hatályos.
            </strong>{' '}
            Vázlat, amit jogi szakembernek kell véglegesítenie — a „TODO”
            jelölésű pontok mind hiányoznak. Az oldal egyelőre nem jelenik meg a
            keresőkben.
          </DraftNotice>

          <LegalSections sections={sections} />

          <p className="mt-12 text-sm text-muted-foreground">
            Utolsó frissítés: TODO
          </p>
        </div>
      </section>
    </PageShell>
  )
}
