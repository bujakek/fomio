import { publicSupabaseEnv } from '@/lib/supabase/env'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Auth gate for the admin area.
 *
 * Next 16 renamed middleware: this file must be `proxy.ts` and the handler must
 * be `proxy`. A `middleware.ts` here would be silently ignored — no warning, no
 * error — leaving /admin open while looking guarded in the source tree.
 *
 * The matcher export is still `config`, **not** `proxyConfig`. Getting that
 * wrong is worse than it sounds: the matcher is ignored and the proxy runs on
 * every request, so an unauthenticated visitor is redirected to the login page
 * from the marketing homepage, the guest event pages and robots.txt alike.
 * Silently, again. Verify by requesting `/` signed out — it must return 200.
 */
export async function proxy(request: NextRequest) {
  const { url, anonKey } = publicSupabaseEnv()

  // Rebuilt whenever Supabase rotates cookies, so a refreshed session is
  // actually carried back to the browser.
  let response = NextResponse.next({ request })

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        )
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        )
      },
    },
  })

  // getUser(), never getSession(). getSession() reads the cookie without
  // verifying it, so it will happily report a user for a forged one — fine for
  // deciding what to render, useless for deciding who gets in.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isLoginRoute = request.nextUrl.pathname.startsWith('/admin/login')

  if (!user && !isLoginRoute) {
    const redirectTo = request.nextUrl.clone()
    redirectTo.pathname = '/admin/login'
    redirectTo.search = ''
    return NextResponse.redirect(redirectTo)
  }

  if (user && isLoginRoute) {
    const redirectTo = request.nextUrl.clone()
    redirectTo.pathname = '/admin'
    redirectTo.search = ''
    return NextResponse.redirect(redirectTo)
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*'],
}
