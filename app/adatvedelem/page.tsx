import { DraftNotice } from '@/components/site/draft-notice'
import {
  LegalSections,
  type LegalSection,
} from '@/components/site/legal-sections'
import { PageShell } from '@/components/site/page-shell'
import { CONTACT_EMAIL } from '@/lib/site'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Adatkezelési tájékoztató — OurFilm',
  description:
    'Hogyan kezeli az OurFilm a feltöltött fotókat és a hozzájuk tartozó adatokat.',
  // TODO(legal): remove once a lawyer-reviewed text replaces this scaffold.
  robots: { index: false, follow: true },
}

// PLACEHOLDER — structure only. The factual bullets describe what the code
// actually does today; everything marked TODO needs real legal text. This is
// NOT a GDPR-compliant privacy notice as it stands.
const sections: LegalSection[] = [
  {
    title: 'Ki kezeli az adataidat',
    body: [
      'TODO: az adatkezelő cégneve, székhelye, cégjegyzékszáma és adószáma.',
      `Kapcsolat: ${CONTACT_EMAIL}`,
    ],
  },
  {
    title: 'Milyen adatokat kezelünk',
    body: [
      'A vendégek által feltöltött fényképeket, és a hozzájuk tartozó technikai adatokat: méret, fájlméret, formátum, és — ha a fotó tartalmazta — a készítés időpontja.',
      'A vendég megadhat egy becenevet a feltöltéshez. Ez nem kötelező, és a böngészője tárolja, hogy ne kelljen újra beírnia.',
      'A vendégeknek nincs fiókjuk: nem kérünk e-mail-címet, jelszót és regisztrációt. A házigazda fiókjához e-mail-cím tartozik, mert a belépés e-mailben küldött linkkel történik.',
    ],
  },
  {
    title: 'Miért kezeljük ezeket',
    body: [
      'TODO: jogalapok az eseményhez tartozó fotók tárolására, a házigazda hozzáférésére és a letöltésre.',
    ],
  },
  {
    title: 'Ki fér hozzá a fotókhoz',
    body: [
      'Az album címe véletlen karaktereket tartalmaz, és nem szerepel egyetlen keresőben sem. Aki nem kapta meg a linket vagy a QR-kódot, nem talál rá.',
      'Az esemény házigazdája látja és letöltheti az album összes fotóját, és el is rejthet közülük bármelyiket.',
      'TODO: adatfeldolgozók felsorolása — tárhely- és üzemeltető szolgáltatók, és hogy hol tárolják az adatokat.',
    ],
  },
  {
    title: 'Meddig őrizzük meg',
    body: ['TODO: megőrzési idő eseményenként, és mi történik utána.'],
  },
  {
    title: 'Milyen jogaid vannak',
    body: [
      'TODO: hozzáférés, helyesbítés, törlés, tiltakozás, adathordozhatóság, panasz a NAIH-nál — a vonatkozó határidőkkel együtt.',
      'Ha egy rólad készült fotót el szeretnél távolíttatni az albumból, szólj az esemény házigazdájának, vagy írj nekünk.',
    ],
  },
  {
    title: 'Sütik és mérés',
    body: [
      'TODO: a látogatottságmérés leírása, és hogy pontosan mit tárol a böngésződben.',
    ],
  },
]

export default function AdatvedelemPage() {
  return (
    <PageShell
      eyebrow="ADATKEZELÉS"
      title="Adatkezelési tájékoztató"
      lead="Mi történik a feltöltött fotókkal, ki látja őket, és mit tehetsz, ha törölni szeretnél valamit."
    >
      <section className="relative px-4 pb-24 sm:px-6 lg:pb-32">
        <div className="mx-auto max-w-3xl">
          <DraftNotice>
            <strong className="font-semibold text-foreground">
              Ez a szöveg még nem végleges, és jogilag nem hatályos.
            </strong>{' '}
            A szerkezet és a tényleírások megvannak, de a „TODO” jelölésű
            pontokat jogi szakembernek kell megírnia, mielőtt az oldal élesbe
            kerül. Az oldal egyelőre nem jelenik meg a keresőkben.
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
