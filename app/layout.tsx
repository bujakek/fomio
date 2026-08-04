import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Manrope } from 'next/font/google'
import './globals.css'

const manrope = Manrope({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-manrope',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://pillanatok.app'),
  title: 'Pillanatok — QR-kódos közös fotóalbum eseményekhez',
  description:
    'A vendégek beolvassák a QR-kódot, és a telefonjuk böngészőjéből azonnal feltöltik a képeiket. Nincs alkalmazás, nincs regisztráció — minden fotó egyetlen közös, privát galériába érkezik, eredeti minőségben.',
  keywords: [
    'közös fotóalbum',
    'QR-kód',
    'esküvői fotók',
    'esemény galéria',
    'vendég fotók',
    'Pillanatok',
  ],
  authors: [{ name: 'Pillanatok' }],
  openGraph: {
    type: 'website',
    locale: 'hu_HU',
    url: 'https://pillanatok.app',
    siteName: 'Pillanatok',
    title: 'Pillanatok — Az esemény minden vendég szemével',
    description:
      'QR-kódos közös fotóalbum eseményekhez. A vendégek a telefonjuk böngészőjéből töltik fel a képeket — app és regisztráció nélkül.',
    images: [
      {
        url: '/images/wedding-dance.png',
        width: 1200,
        height: 630,
        alt: 'Esküvői első tánc a Pillanatok közös albumában',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pillanatok — Az esemény minden vendég szemével',
    description:
      'QR-kódos közös fotóalbum eseményekhez. App és regisztráció nélkül.',
    images: ['/images/wedding-dance.png'],
  },
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#050505',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="hu" className="bg-background">
      <body className={`${manrope.variable} font-sans antialiased`}>
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
