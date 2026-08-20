'use client'

import { createClient } from '@/lib/supabase/client'
import { Check, Loader2, Mail } from 'lucide-react'
import { useRef, useState } from 'react'

type State = 'idle' | 'sending' | 'sent' | 'error'

export function LoginForm({ linkError }: { linkError: boolean }) {
  const [state, setState] = useState<State>('idle')
  const [message, setMessage] = useState('')

  // `disabled={state === 'sending'}` is not a lock. setState schedules a
  // re-render, and the attribute only reaches the DOM once React commits it —
  // so a second submit dispatched in the same tick (double-tap, or Enter held
  // down) runs before the button is ever disabled, and Supabase sends a second
  // magic link. Each new link invalidates the previous one, so the fast
  // clicker ends up with two mails and the one they open first is dead.
  //
  // A ref flips synchronously, which is what actually closes the window. Same
  // pattern as `runningRef` in components/event/upload-queue.tsx.
  const sendingRef = useRef(false)

  async function onSubmit(formData: FormData) {
    const email = String(formData.get('email') ?? '').trim()
    if (!email) return

    if (sendingRef.current) return
    sendingRef.current = true

    setState('sending')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Must also be listed under Redirect URLs in the Supabase dashboard,
        // or the link comes back rejected.
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        // The same link signs in and signs up. Safe because owner_id scoping
        // is enforced in the database, not the UI: a brand-new account sees an
        // empty admin, never anyone else's events. Verified with a second real
        // account.
        shouldCreateUser: true,
      },
    })

    if (error) {
      // Released only on failure. On success the form unmounts for the
      // confirmation card, so there is nothing left to submit twice.
      sendingRef.current = false
      setState('error')
      setMessage('Nem sikerült elküldeni. Próbáld újra egy kicsit később.')
      return
    }
    setState('sent')
  }

  if (state === 'sent') {
    return (
      <div className="glass-strong flex flex-col items-center gap-3 rounded-3xl px-6 py-8 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-accent/20">
          <Check className="size-7 text-accent" strokeWidth={2.2} />
        </span>
        <p className="text-lg font-semibold">Elküldtük a belépési linket</p>
        <p className="max-w-xs text-sm leading-relaxed text-pretty text-muted-foreground">
          Nézd meg a postaládádat, és koppints a linkre. Ugyanezen az eszközön
          nyisd meg, ahol most vagy.
        </p>
      </div>
    )
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-4">
      <div>
        <label
          htmlFor="email"
          className="mb-2 block text-sm text-muted-foreground"
        >
          E-mail-cím
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          disabled={state === 'sending'}
          placeholder="te@pelda.hu"
          className="glass min-h-14 w-full rounded-2xl px-5 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-accent disabled:opacity-60"
        />
      </div>

      {linkError || state === 'error' ? (
        <p className="text-destructive text-sm">
          {state === 'error'
            ? message
            : 'Ez a link lejárt vagy már felhasználtad. Kérj egy újat.'}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={state === 'sending'}
        aria-busy={state === 'sending'}
        className="btn-shine inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-primary px-7 text-base font-semibold text-primary-foreground disabled:opacity-60"
      >
        {state === 'sending' ? (
          <Loader2 className="size-5 animate-spin" aria-hidden="true" />
        ) : (
          <Mail className="size-5" strokeWidth={1.8} aria-hidden="true" />
        )}
        {state === 'sending' ? 'Küldés…' : 'Belépési link kérése'}
      </button>
    </form>
  )
}
