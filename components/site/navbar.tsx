'use client'

import { cn } from '@/lib/utils'
import { Aperture, Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'

const navLinks = [
  { label: 'Hogyan működik', href: '#hogyan-mukodik' },
  { label: 'Alkalmak', href: '#alkalmak' },
  { label: 'Vélemények', href: '#velemenyek' },
  { label: 'GYIK', href: '#gyik' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
      <nav
        className={cn(
          'glass-nav flex w-full max-w-3xl items-center gap-2 rounded-full py-2 pr-2 pl-3 transition-shadow duration-500 sm:gap-3 sm:pr-2.5 sm:pl-4',
          scrolled && 'shadow-[0_16px_48px_-12px_rgba(0,0,0,0.95)]',
        )}
        aria-label="Fő navigáció"
      >
        <a href="#top" className="flex shrink-0 items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-white/5">
            <Aperture className="size-4 text-accent" strokeWidth={1.6} />
          </span>
          <span className="text-base font-semibold tracking-tight">Fomio</span>
        </a>

        <ul className="hidden flex-1 items-center justify-center gap-0.5 md:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="rounded-full px-3 py-2 text-sm text-foreground/70 transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <a
          href="#zaro-cta"
          className="btn-shine hidden shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03] md:inline-flex"
        >
          Esemény létrehozása
        </a>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Menü bezárása' : 'Menü megnyitása'}
          aria-expanded={open}
          className="ml-auto flex size-10 shrink-0 items-center justify-center rounded-full bg-white/5 text-foreground md:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {/* Mobile full-screen panel */}
      <div
        className={cn(
          'fixed inset-0 z-40 flex flex-col px-4 pt-24 transition-all duration-400 md:hidden',
          open
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0',
        )}
      >
        <div className="absolute inset-0 -z-10 bg-background/80 backdrop-blur-2xl" />
        <div className="glass-nav flex flex-col gap-1 rounded-3xl p-4">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-2xl px-5 py-4 text-lg font-medium text-foreground/90 transition-colors hover:bg-white/5"
            >
              {link.label}
            </a>
          ))}
          <a
            href="#zaro-cta"
            onClick={() => setOpen(false)}
            className="btn-shine mt-2 rounded-2xl bg-primary px-5 py-4 text-center text-lg font-semibold text-primary-foreground"
          >
            Esemény létrehozása
          </a>
        </div>
      </div>
    </header>
  )
}
