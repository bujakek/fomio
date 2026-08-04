'use client'

import { QRCodeSVG } from 'qrcode.react'
import { useMemo, useState } from 'react'
import { Reveal } from './reveal'

function slugify(input: string) {
  const base = input
    .toLowerCase()
    .normalize('NFD')
    // strip diacritics
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
  return base || 'esemeny'
}

export function QrPreview() {
  const [name, setName] = useState('Anna & Péter')
  const slug = useMemo(() => slugify(name), [name])
  const url = `https://pillanatok.app/e/${slug}`
  const displayName = name.trim() || 'Az esemény neve'

  return (
    <section className="relative px-4 py-24 sm:px-6 lg:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Copy + input */}
          <Reveal>
            <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium tracking-wide text-accent">
              QR-KÓD ELŐNÉZET
            </span>
            <h2 className="mt-6 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Nézd meg, mit olvasnak be a vendégeid
            </h2>
            <p className="mt-4 max-w-md text-pretty leading-relaxed text-muted-foreground">
              Írd be az esemény nevét, és azonnal látod a kártyát, ami az
              asztalokra kerül. A vendégek ezt olvassák be, és már tölthetik is
              fel a képeiket.
            </p>

            <div className="mt-8 max-w-md">
              <label
                htmlFor="event-name"
                className="mb-2 block text-sm font-medium text-muted-foreground"
              >
                Az esemény neve
              </label>
              <input
                id="event-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                placeholder="Anna & Péter"
                className="glass w-full rounded-2xl px-5 py-3.5 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-accent"
              />
              <div className="mt-4 flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">A generált link:</span>
                <code className="glass truncate rounded-lg px-2.5 py-1 text-xs text-accent">
                  {url}
                </code>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                A valódi eseményedhez nyomtatható kártyát és megosztható linket
                is kapsz.
              </p>
            </div>
          </Reveal>

          {/* Printable card */}
          <Reveal delay={120} className="flex justify-center">
            <div className="glass-strong w-full max-w-sm rounded-[2rem] p-3">
              <div className="rounded-[1.6rem] bg-gradient-to-b from-white to-[#f2f2f5] p-8 text-center text-black">
                <p className="text-2xl font-semibold tracking-tight text-balance">
                  {displayName}
                </p>
                <p className="mt-1 text-xs font-semibold tracking-[0.25em] text-black/50">
                  KÖZÖS FOTÓALBUM
                </p>

                <div className="my-7 flex justify-center">
                  <div className="rounded-2xl bg-white p-4 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.4)]">
                    <QRCodeSVG
                      value={url}
                      size={168}
                      level="M"
                      bgColor="#ffffff"
                      fgColor="#050505"
                    />
                  </div>
                </div>

                <p className="mx-auto max-w-[15rem] text-sm leading-relaxed text-black/70">
                  Olvasd be, és töltsd fel a képeidet — app és regisztráció
                  nélkül.
                </p>
                <div className="mt-6 border-t border-black/10 pt-4">
                  <p className="truncate text-xs font-medium text-black/50">
                    {url.replace('https://', '')}
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
