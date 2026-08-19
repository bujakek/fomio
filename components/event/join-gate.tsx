'use client'

import {
  GUEST_NAME_MAX_LENGTH,
  hasGuestName,
  writeGuestName,
} from '@/lib/guest-name'
import { useGuestState } from '@/lib/use-guest-state'
import { useState } from 'react'

/**
 * Stands between a guest and the album until they give a name.
 *
 * **This is a UX gate, not access control**, and the gap is wider than it
 * looks. The children never reach the DOM, but they are still server-rendered
 * and shipped: a gated gallery's flight payload carries every photo's
 * `thumb_path` and `uploader_name` (verified — 10 of each on the sample
 * album), so view-source reconstructs the album without ever typing a name.
 * Clearing site data walks past it just as easily.
 *
 * Do not let its presence be mistaken for a privacy boundary. Privacy still
 * rests entirely on the unguessable slug. If this ever needs to be real, it
 * has to move into the database — the guest RPCs would need to require
 * something the browser cannot fabricate.
 *
 * Wraps the whole `/e/[slug]` subtree rather than the landing page alone,
 * because a guest handed a direct link to the gallery would otherwise never
 * meet it.
 *
 * The server render shows the gate rather than the album. A guest who has
 * already joined therefore sees it for one frame before the content swaps in —
 * the alternative is flashing the album at someone who has not joined, which
 * defeats the point of having a gate at all.
 */
export function JoinGate({
  eventName,
  children,
}: {
  eventName: string
  children: React.ReactNode
}) {
  const alreadyJoined = useGuestState(hasGuestName, false)
  const [justJoined, setJustJoined] = useState(false)
  const [value, setValue] = useState('')

  if (alreadyJoined || justJoined) return <>{children}</>

  const name = value.trim()

  const join = () => {
    if (!name) return
    writeGuestName(name)
    setJustJoined(true)
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-10 sm:py-16">
      <div className="text-center">
        <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium tracking-wide text-accent">
          KÖZÖS FOTÓALBUM
        </span>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {eventName}
        </h1>
        <p className="mx-auto mt-5 max-w-sm leading-relaxed text-pretty text-muted-foreground">
          Írd be a neved, hogy a képeid alatt lássák, kitől érkeztek. Fiókot nem
          kell létrehoznod, és e-mail-címet sem kérünk.
        </p>
      </div>

      <div className="mt-8">
        <label htmlFor="join-name" className="sr-only">
          Mi a neved?
        </label>
        <input
          id="join-name"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') join()
          }}
          maxLength={GUEST_NAME_MAX_LENGTH}
          autoComplete="name"
          autoFocus
          placeholder="Mi a neved?"
          className="glass min-h-14 w-full rounded-2xl px-5 text-center text-base text-foreground transition-colors outline-none placeholder:text-muted-foreground/60 focus:border-accent"
        />

        <button
          type="button"
          onClick={join}
          disabled={!name}
          className="btn-shine mt-3 inline-flex min-h-14 w-full items-center justify-center rounded-full bg-primary px-7 text-base font-semibold text-primary-foreground transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
        >
          Csatlakozom
        </button>
      </div>
    </main>
  )
}
