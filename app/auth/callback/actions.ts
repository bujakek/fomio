'use server'

import { safeNext } from '@/lib/safe-next'
import { createClient } from '@/lib/supabase/server'
import { type EmailOtpType } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import { redirect, RedirectType } from 'next/navigation'

async function requestOrigin(): Promise<string> {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  if (!host) return 'http://localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? 'https'
  return `${proto}://${host}`
}

/**
 * Finish the magic-link sign-in.
 *
 * Lives in a Server Action so cookies can actually be written — a Server
 * Component cannot set them — while the page itself paints "Belépés…" without
 * waiting on Supabase. The Route Handler this replaced returned a redirect
 * with no body, so the tab stayed blank through the whole exchange.
 */
export async function completeMagicLink({
  code,
  tokenHash,
  type,
  next,
}: {
  code: string | null
  tokenHash: string | null
  type: string | null
  next: string | null
}) {
  const supabase = await createClient()

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({
          type: type as EmailOtpType,
          token_hash: tokenHash,
        })
      : { error: new Error('Hiányzó belépési kód') }

  if (error) {
    redirect('/admin/login?error=link', RedirectType.replace)
  }

  redirect(safeNext(next, await requestOrigin()), RedirectType.replace)
}
