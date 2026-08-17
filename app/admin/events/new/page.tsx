import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { NewEventForm } from './new-event-form'

export const metadata: Metadata = {
  title: 'Új esemény — OurFilm',
  robots: { index: false, follow: false },
}

export default function NewEventPage() {
  return (
    <main className="mx-auto w-full max-w-lg px-4 py-10 sm:py-16">
      <Link
        href="/admin"
        className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Eseményeid
      </Link>
      <h1 className="mt-6 mb-8 text-3xl font-semibold tracking-tight">
        Új esemény
      </h1>
      <NewEventForm />
    </main>
  )
}
