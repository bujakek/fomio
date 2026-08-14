import { BackgroundGlow } from '@/components/site/background-glow'
import { getOwnedEvents } from '@/lib/events'
import { formatEventDate } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import { CalendarPlus, EyeOff, Lock, LogOut } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Áttekintés — Fomio',
  robots: { index: false, follow: false },
}

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const events = await getOwnedEvents()

  return (
    <div className="relative min-h-screen">
      <BackgroundGlow />
      <main className="relative z-10 mx-auto w-full max-w-3xl px-4 py-10 sm:py-16">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Eseményeid
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="glass glass-hover inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-medium"
            >
              <LogOut className="size-4" />
              Kilépés
            </button>
          </form>
        </div>

        {events.length === 0 ? (
          <div className="glass mt-10 flex flex-col items-center gap-3 rounded-3xl px-6 py-10 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-accent/20">
              <CalendarPlus className="size-7 text-accent" strokeWidth={1.8} />
            </span>
            <p className="text-lg font-semibold">Még nincs eseményed</p>
            <p className="max-w-sm text-sm leading-relaxed text-pretty text-muted-foreground">
              Hozz létre egyet, és megkapod hozzá a QR-kódot, amit az asztalokra
              tehetsz.
            </p>
          </div>
        ) : (
          <ul className="mt-8 flex flex-col gap-3">
            {events.map((event) => {
              const closed =
                event.uploads_close_at !== null &&
                new Date(event.uploads_close_at) <= new Date()
              return (
                <li key={event.id}>
                  <Link
                    href={`/e/${event.slug}`}
                    className="glass glass-hover flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl px-5 py-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {event.event_name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatEventDate(event.event_date) ?? 'Nincs dátum'} ·
                        /e/{event.slug}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {event.gallery_hidden_at ? (
                        <span className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-muted-foreground">
                          <EyeOff className="size-3" />
                          Rejtett galéria
                        </span>
                      ) : null}
                      {closed ? (
                        <span className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-muted-foreground">
                          <Lock className="size-3" />
                          Feltöltés lezárva
                        </span>
                      ) : null}
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}
