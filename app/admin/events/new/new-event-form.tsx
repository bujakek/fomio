'use client'

import { Loader2, Plus } from 'lucide-react'
import { useActionState, useState } from 'react'
import { createEvent, type CreateEventState } from './actions'

const initial: CreateEventState = { error: null }

export function NewEventForm() {
  const [state, action, pending] = useActionState(createEvent, initial)
  // A datetime-local value has no timezone. Converting it here means the
  // browser's zone is used — which is the host's — instead of the server's.
  const [closesIso, setClosesIso] = useState('')

  return (
    <form action={action} className="flex flex-col gap-5">
      <div>
        <label
          htmlFor="event_name"
          className="mb-2 block text-sm text-muted-foreground"
        >
          Az esemény neve
        </label>
        <input
          id="event_name"
          name="event_name"
          required
          maxLength={80}
          autoFocus
          placeholder="Anna &amp; Péter"
          className="glass min-h-14 w-full rounded-2xl px-5 text-base outline-none placeholder:text-muted-foreground/60 focus:border-accent"
        />
      </div>

      <div>
        <label
          htmlFor="event_date"
          className="mb-2 block text-sm text-muted-foreground"
        >
          Dátum — nem kötelező
        </label>
        <input
          id="event_date"
          name="event_date"
          type="date"
          className="glass min-h-14 w-full rounded-2xl px-5 text-base outline-none focus:border-accent"
        />
      </div>

      <div>
        <label
          htmlFor="closes_local"
          className="mb-2 block text-sm text-muted-foreground"
        >
          Feltöltés eddig — nem kötelező
        </label>
        <input
          id="closes_local"
          type="datetime-local"
          onChange={(e) =>
            setClosesIso(
              e.target.value ? new Date(e.target.value).toISOString() : '',
            )
          }
          className="glass min-h-14 w-full rounded-2xl px-5 text-base outline-none focus:border-accent"
        />
        <input type="hidden" name="uploads_close_at" value={closesIso} />
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Ha üresen hagyod, a vendégek bármeddig tölthetnek fel. A galéria
          ezután is megmarad.
        </p>
      </div>

      {state.error ? (
        <p className="text-destructive text-sm">{state.error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="btn-shine inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-primary px-7 text-base font-semibold text-primary-foreground disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <Plus className="size-5" strokeWidth={2} />
        )}
        {pending ? 'Létrehozás…' : 'Esemény létrehozása'}
      </button>
    </form>
  )
}
