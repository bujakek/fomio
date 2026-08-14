'use client'

import { deleteEvent } from '@/app/admin/events/[slug]/actions'
import { Loader2, Trash2 } from 'lucide-react'
import { useState, useTransition } from 'react'

/**
 * Permanent deletion, gated behind typing the event name.
 *
 * A confirm() dialog is one reflexive tap away from destroying a wedding
 * album; retyping the name forces the host to read what they are about to
 * erase. This is the only irreversible action in the product.
 */
export function DangerZone({
  slug,
  eventName,
  photoCount,
}: {
  slug: string
  eventName: string
  photoCount: number
}) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const armed = value.trim() === eventName

  return (
    <section className="print-hidden border-destructive/30 mt-12 rounded-2xl border px-5 py-4">
      <h2 className="text-destructive font-semibold">Esemény törlése</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Végleg törli az eseményt és mind a {photoCount} képet. Ez nem vonható
        vissza — a vendégek képei sem állíthatók vissza utána.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="border-destructive/40 text-destructive mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border px-5 text-sm font-semibold"
        >
          <Trash2 className="size-4" />
          Törlés…
        </button>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          <label htmlFor="confirm" className="text-sm text-muted-foreground">
            Írd be az esemény nevét a megerősítéshez:{' '}
            <span className="font-medium text-foreground">{eventName}</span>
          </label>
          <input
            id="confirm"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoComplete="off"
            className="glass focus:border-destructive min-h-12 w-full rounded-2xl px-4 text-base outline-none"
          />
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!armed || pending}
              onClick={() =>
                startTransition(async () => {
                  setError(null)
                  try {
                    await deleteEvent(slug, value)
                  } catch (e) {
                    // redirect() throws to navigate, so a real failure is the
                    // only thing with a message worth showing.
                    const message = e instanceof Error ? e.message : ''
                    if (message) setError(message)
                  }
                })
              }
              className="bg-destructive/90 inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold text-white disabled:opacity-40"
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Végleges törlés
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setValue('')
                setError(null)
              }}
              className="glass glass-hover inline-flex min-h-12 items-center justify-center rounded-full px-5 text-sm font-medium"
            >
              Mégsem
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
