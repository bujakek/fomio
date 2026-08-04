import { BackgroundGlow } from '@/components/site/background-glow'
import { Benefits } from '@/components/site/benefits'
import { Faq } from '@/components/site/faq'
import { FinalCta } from '@/components/site/final-cta'
import { Footer } from '@/components/site/footer'
import { Hero } from '@/components/site/hero'
import { HowItWorks } from '@/components/site/how-it-works'
import { InstantAccess } from '@/components/site/instant-access'
import { LiveDemo } from '@/components/site/live-demo'
import { Navbar } from '@/components/site/navbar'
import { Occasions } from '@/components/site/occasions'
import { PhotoQuality } from '@/components/site/photo-quality'
import { QrPreview } from '@/components/site/qr-preview'
import { Stats } from '@/components/site/stats'
import { Testimonials } from '@/components/site/testimonials'

export default function Page() {
  return (
    <div className="relative min-h-screen">
      <BackgroundGlow />
      <Navbar />
      <main className="relative z-10">
        <Hero />
        <Stats />
        <Benefits />
        <Testimonials />
        <Occasions />
        <LiveDemo />
        <HowItWorks />
        <QrPreview />
        <PhotoQuality />
        <InstantAccess />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}
