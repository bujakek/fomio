import { EventList } from '@/components/admin/event-list'
import { eventIsActive, getOwnedEventsWithPreviews } from '@/lib/events'
import { createClient } from '@/lib/supabase/server'
import { CalendarPlus, LogOut, Plus } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Áttekintés — OurFilm',
  robots: { index: false, follow: false },
}

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const events = await getOwnedEventsWithPreviews()

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Eseményeid</h1>
          <p className="mt-2 text-sm text-muted-foreground">{user?.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/events/new"
            className="btn-shine inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="size-4" strokeWidth={2.2} />
            Új esemény
          </Link>
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
        <EventList
          active={events.filter(eventIsActive)}
          closed={events.filter((e) => !eventIsActive(e))}
        />
      )}
    </main>
  )
}
