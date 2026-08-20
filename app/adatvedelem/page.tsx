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
      'A vendég a csatlakozáskor megadja a nevét — ezt a saját böngészője tárolja, és minden általa feltöltött fotóhoz hozzákapcsoljuk, hogy látszódjon, kitől érkezett. Bármilyen nevet megadhat; nem ellenőrizzük.',
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
      'A vendégek böngészőjében nem használunk sütiket. A megadott nevet és néhány beállítást a böngésző saját tárhelye (localStorage) őriz — ez nem hagyja el az eszközt, és a böngészőadatok törlésével nyomtalanul eltűnik.',
      'A házigazda belépéséhez sütire van szükség, mert ez tartja fenn a bejelentkezett munkamenetet.',
      'Látogatottságot mérünk (Vercel Web Analytics), amely oldalletöltéseket számol. TODO: pontosítani, hogy ez milyen adatot tárol, és hogy szükséges-e hozzá hozzájárulás.',
    ],
  },
  {
    title: 'Hol tároljuk a fotókat',
    body: [
      'A fotók és a hozzájuk tartozó adatok a Supabase zürichi (svájci) régiójában tárolódnak. Svájc az EGT-n kívül van, ezért ez harmadik országba történő adattovábbításnak minősül — az Európai Bizottság megfelelőségi határozata alapján, külön garanciák (SCC) nélkül.',
      'A weboldalt a Vercel szolgálja ki. TODO: a Vercel kiszolgálási régiói és az ehhez tartozó adattovábbítási jogalap pontosítása.',
    ],
  },
  {
    title: 'Hogyan védjük az adatokat',
    body: [
      'A kapcsolat titkosított (HTTPS). Az albumok címe véletlen karaktereket tartalmaz, és a keresők elől ki van zárva.',
      'Az adatbázis sorszintű jogosultságkezelést (RLS) használ: a házigazda kizárólag a saját eseményeit éri el, a vendégek pedig egyetlen táblát sem olvashatnak közvetlenül.',
      'TODO: incidenskezelés — kit és milyen határidővel értesítünk adatvédelmi incidens esetén.',
    ],
  },
  {
    title: 'Ha rólad készült fotó került az albumba',
    body: [
      'A vendégek olyan fotókat is feltölthetnek, amelyeken mások szerepelnek — akik nem jártak az oldalunkon, és nem adtak meg semmit. Rájuk ugyanúgy vonatkoznak a fenti jogok.',
      'Ha egy rólad készült képet el szeretnél távolíttatni, szólj az esemény házigazdájának, aki azonnal elrejtheti, vagy írj nekünk közvetlenül.',
      'TODO: ez a szakasz jogilag a legkényesebb — tisztázni kell, hogy az esemény fotói tekintetében a házigazda adatkezelő és az OurFilm adatfeldolgozó, vagy közös adatkezelésről van-e szó, és ehhez igazítani, ki válaszol egy ilyen kérésre.',
    ],
  },
  {
    title: 'Gyerekek',
    body: [
      'TODO: eseményeken gyerekekről is készülnek fotók. Tisztázni kell, hogy ez hogyan kezelendő, és külön attól, hogy a szolgáltatást kik használhatják (a GDPR 8. cikke szerinti korhatár Magyarországon 16 év).',
    ],
  },
  {
    title: 'A tájékoztató változásai',
    body: [
      'TODO: hogyan és mikor értesítünk a változásokról, és hol lesz látható, mikor frissült utoljára.',
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
