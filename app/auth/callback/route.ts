import { createClient } from '@/lib/supabase/server'
import { type EmailOtpType } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Where the magic link lands.
 *
 * Handles both shapes Supabase can send, because which one arrives depends on
 * the email template configured in the dashboard and getting it wrong means a
 * login link that silently does nothing:
 *
 *   ?code=…                    default template, PKCE — exchange for a session
 *   ?token_hash=…&type=magiclink   custom template — verify the OTP directly
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/admin'

  const supabase = await createClient()

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
      : { error: new Error('Hiányzó belépési kód') }

  if (error) {
    const failed = new URL('/admin/login', origin)
    failed.searchParams.set('error', 'link')
    return NextResponse.redirect(failed)
  }

  return NextResponse.redirect(new URL(next, origin))
}
