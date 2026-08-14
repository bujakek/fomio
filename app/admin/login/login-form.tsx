'use client'

import { createClient } from '@/lib/supabase/client'
import { Check, Loader2, Mail } from 'lucide-react'
import { useState } from 'react'

type State = 'idle' | 'sending' | 'sent' | 'error'

export function LoginForm({ linkError }: { linkError: boolean }) {
  const [state, setState] = useState<State>('idle')
  const [message, setMessage] = useState('')

  async function onSubmit(formData: FormData) {
    const email = String(formData.get('email') ?? '').trim()
    if (!email) return

    setState('sending')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Must also be listed under Redirect URLs in the Supabase dashboard,
        // or the link comes back rejected.
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        // No self-signup: the host account is created deliberately. Without
        // this, anyone who guesses /admin/login could mint an account — which
        // would still see an empty admin thanks to owner_id scoping, but there
        // is no reason to allow it.
        shouldCreateUser: false,
      },
    })

    if (error) {
      setState('error')
      setMessage(error.message)
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
          placeholder="te@pelda.hu"
          className="glass min-h-14 w-full rounded-2xl px-5 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-accent"
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
        className="btn-shine inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-primary px-7 text-base font-semibold text-primary-foreground disabled:opacity-60"
      >
        {state === 'sending' ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <Mail className="size-5" strokeWidth={1.8} />
        )}
        {state === 'sending' ? 'Küldés…' : 'Belépési link kérése'}
      </button>
    </form>
  )
}
