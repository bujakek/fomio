import { createClient } from '@/lib/supabase/server'
import { type EmailOtpType } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Confine a `next` parameter to this site.
 *
 * Without this the callback forwards wherever it is told: `new URL(next,
 * origin)` lets an absolute URL override the base entirely, so `?next=https://
 * evil.example` would land a host on someone else's page moments after a real
 * sign-in on a real ourfilm.app link — which is exactly the moment they are
 * least suspicious of what they are looking at.
 *
 * Resolved through the URL parser and compared by origin rather than
 * prefix-matched as a string, because the parser is what ultimately decides
 * where the redirect goes and it is full of traps a hand-rolled check misses.
 * It strips tabs and newlines *before* parsing, so `/\t/evil.example` is
 * `//evil.example` — protocol-relative and off-site — to everything that
 * matters, while `startsWith('/')` waves it through. Backslashes are folded to
 * slashes for the same reason. Delegating removes the need to predict any of
 * that.
 */
function safeNext(raw: string | null, origin: string): string {
  const fallback = '/admin'
  if (!raw) return fallback

  try {
    const target = new URL(raw, origin)
    if (target.origin !== origin) return fallback
    // Rebuilt from the parsed parts, so what gets redirected to is what was
    // actually checked.
    return target.pathname + target.search + target.hash
  } catch {
    return fallback
  }
}

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
  const next = safeNext(searchParams.get('next'), origin)

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
