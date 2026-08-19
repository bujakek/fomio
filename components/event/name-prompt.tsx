'use client'

import {
  GUEST_NAME_MAX_LENGTH,
  dismissNamePrompt,
  shouldAskForName,
  writeGuestName,
} from '@/lib/guest-name'
import { useGuestState } from '@/lib/use-guest-state'
import { Check, X } from 'lucide-react'
import { useState } from 'react'

/**
 * Asks a first-time guest what to call them.
 *
 * Deliberately not a modal and deliberately not on the critical path. Guests
 * have no gate of any kind on this project, and the pilot exists to measure
 * whether they upload at all — anything that stands between the QR scan and
 * the upload button risks moving the only number we are trying to read. So
 * this sits alongside the actions rather than in front of them, and declining
 * is a first-class button rather than a dismissal X.
 *
 * Renders nothing until after hydration: the answer lives in localStorage,
 * which does not exist on the server. `useGuestState` handles that without a
 * mismatch, so the card appears a beat late — the correct trade for a prompt
 * nobody is waiting on.
 */
export function NamePrompt() {
  // Whether this device has ever answered. Closed over the module's
  // localStorage read, hidden during SSR.
  const ask = useGuestState(shouldAskForName, false)
  // Answered *in this session*. Separate from `ask` because localStorage is
  // not reactive — writing to it does not re-render anything.
  const [answered, setAnswered] = useState(false)
  const [value, setValue] = useState('')
  const [saved, setSaved] = useState(false)

  if (!ask || answered) return null

  const save = () => {
    const name = value.trim()
    if (!name) return
    writeGuestName(name)
    setSaved(true)
    // Leave the confirmation up briefly so the guest sees the name took,
    // rather than the card vanishing out from under them.
    setTimeout(() => setAnswered(true), 1200)
  }

  const skip = () => {
    dismissNamePrompt()
    setAnswered(true)
  }

  if (saved) {
    return (
      <div className="glass mt-8 flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-sm">
        <Check
          className="size-4 text-accent"
          strokeWidth={2.2}
          aria-hidden="true"
        />
        <span>
          Szia, <strong className="font-semibold">{value.trim()}</strong>!
        </span>
      </div>
    )
  }

  return (
    <div className="glass mt-8 rounded-3xl p-5 text-left">
      <label
        htmlFor="guest-name"
        className="block text-sm font-medium text-foreground"
      >
        Mi a neved?
      </label>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Csak azért, hogy a képeid alatt lássák, kitől érkeztek. Nem kötelező.
      </p>

      <input
        id="guest-name"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save()
        }}
        maxLength={GUEST_NAME_MAX_LENGTH}
        autoComplete="name"
        placeholder="Például: Réka"
        className="glass mt-4 min-h-14 w-full rounded-2xl px-5 text-base text-foreground transition-colors outline-none placeholder:text-muted-foreground/60 focus:border-accent"
      />

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={!value.trim()}
          className="btn-shine inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
        >
          Mentés
        </button>
        <button
          type="button"
          onClick={skip}
          className="glass glass-hover inline-flex min-h-12 items-center justify-center gap-1.5 rounded-full px-5 text-sm font-medium text-muted-foreground"
        >
          <X className="size-4" aria-hidden="true" />
          Kihagyom
        </button>
      </div>
    </div>
  )
}
