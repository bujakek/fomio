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
      'TODO — a 45/2014. (II. 26.) Korm. rendelet és az Elker tv. szerint mindegyik kötelező: cégnév, székhely, telefonszám, e-mail-cím, adószám, a bejegyző bíróság megnevezése és a cégjegyzékszám, valamint a szakmai kamara megnevezése.',
      'TODO: a tárhelyszolgáltató neve, székhelye és elérhetősége.',
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
      'A házigazda felel azért, hogy a vendégek és a fotókon szereplő személyek tudjanak róla, hogy a képek közös albumba kerülnek. Ehhez a nyomtatható QR-kártya rövid tájékoztató szövege adja a legegyszerűbb eszközt, de a meghívóban is jelezhető.',
      'TODO: felelősség a feltöltött tartalomért és a moderálásért.',
      'TODO — jogi döntés, az adatkezelési tájékoztatóval együtt rendezendő: az esemény fotói tekintetében a házigazda az adatkezelő és az OurFilm az adatfeldolgozó (ez a bevett modell a hasonló szolgáltatásoknál), vagy közös adatkezelés áll fenn. Ha az előbbi, ide vagy külön adatfeldolgozói megállapodásba kell foglalni a GDPR 28. cikke szerinti kötelező tartalmat.',
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
      'TODO: díjszabás bruttó, áfával növelt árban, számlázás, teljesítési határidő.',
      'TODO — elállási jog, és itt könnyű hibázni. Nem tárgyi adathordozón nyújtott digitális szolgáltatásnál a fogyasztó csak akkor veszíti el a 14 napos elállási jogát, ha a teljesítés a kifejezett, előzetes kérésére indult el, ÉS ezzel egyidejűleg külön nyilatkozott arról, hogy tudomásul veszi a jog elvesztését. A házigazda jellemzően azonnal használni kezdi az eseményt, ezért e két nyilatkozat nélkül 14 napig visszatérítés jár. A nyilatkozatokat a fizetési folyamatba is be kell építeni, nem elég itt leírni.',
      'Amíg nincs végleges árazás, az Árak oldal is csak illusztráció.',
    ],
  },
  {
    title: 'Felelősség és adatvesztés',
    body: [
      'TODO: felelősségkorlátozás, és annak kimondása, hogy a szolgáltatás nem helyettesíti a fotók saját biztonsági mentését.',
    ],
  },
  {
    title: 'Panaszkezelés és jogorvoslat',
    body: [
      'TODO — kötelező elem: hova és hogyan lehet panaszt tenni, milyen határidővel válaszolunk.',
      'TODO — szintén kötelező: a fogyasztó lakóhelye szerint illetékes békéltető testülethez fordulhat, és nyilatkozni kell arról, hogy a békéltetési eljárásban együttműködünk. Ide kell a testületek elérhetősége és a fogyasztóvédelmi hatóság megnevezése is.',
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
