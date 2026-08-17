import { BackgroundGlow } from '@/components/site/background-glow'
import type { Metadata } from 'next'
import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Belépés — OurFilm',
  robots: { index: false, follow: false },
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <BackgroundGlow />
      <main className="relative z-10 w-full max-w-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-balance">
          Belépés vagy regisztráció
        </h1>
        <p className="mt-3 mb-8 leading-relaxed text-pretty text-muted-foreground">
          Add meg az e-mail-címed, és küldünk egy belépési linket. Jelszó nem
          kell — ha még nincs fiókod, a link egyben létre is hozza.
        </p>
        <LoginForm linkError={error === 'link'} />
      </main>
    </div>
  )
}
