'use client'

import { MoveHorizontal } from 'lucide-react'
import Image from 'next/image'
import { useCallback, useRef, useState } from 'react'
import { Reveal } from './reveal'

export function PhotoQuality() {
  const [pos, setPos] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const pct = ((clientX - rect.left) / rect.width) * 100
    setPos(Math.min(100, Math.max(0, pct)))
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    updateFromClientX(e.clientX)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return
    updateFromClientX(e.clientX)
  }
  const onPointerUp = () => {
    dragging.current = false
  }

  return (
    <section className="relative px-4 py-24 sm:px-6 lg:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal className="max-w-2xl">
          <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium tracking-wide text-accent">
            FOTÓMINŐSÉG
          </span>
          <h2 className="mt-6 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Nyomtatható minőségben, nem összenyomva
          </h2>
          <p className="mt-4 leading-relaxed text-pretty text-muted-foreground">
            A vendégek ma jellemzően Messenger-csoportba küldik a képeket, ahol
            a telefon összenyomja őket. Ami ott megmarad, az a fotó töredéke.
            Nálunk minden kép nagy felbontásban érkezik — nagyítható, vágható,
            nyomtatható.
          </p>
        </Reveal>

        <Reveal className="mt-10" delay={100}>
          <div className="glass-strong overflow-hidden rounded-[2rem] p-2">
            <div
              ref={containerRef}
              className="relative aspect-[16/10] w-full cursor-ew-resize touch-none overflow-hidden rounded-[1.6rem] select-none sm:aspect-[16/8]"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
            >
              {/* Original (right, full) */}
              <Image
                src="/images/quality-original.png"
                alt="A fotó éles, nyomtatható minőségben"
                fill
                sizes="(max-width: 768px) 100vw, 1100px"
                className="object-cover"
                priority={false}
              />
              {/* Compressed (left, clipped) */}
              <div
                className="absolute inset-0"
                style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
              >
                <Image
                  src="/images/quality-original.png"
                  alt="Ugyanaz a fotó csevegőappban, összenyomva"
                  fill
                  sizes="(max-width: 768px) 100vw, 1100px"
                  className="object-cover blur-[2.5px] brightness-95 contrast-[0.92] saturate-[0.72]"
                />
                <div className="absolute inset-0 bg-black/10 mix-blend-multiply" />
              </div>

              {/* Labels */}
              <span className="glass absolute top-3 left-3 rounded-full px-3 py-1 text-xs font-medium">
                Csevegőappban
              </span>
              <span className="glass absolute top-3 right-3 rounded-full px-3 py-1 text-xs font-medium text-accent">
                Fomióval
              </span>

              {/* Divider + handle */}
              <div
                className="absolute inset-y-0 w-0.5 bg-white/70"
                style={{ left: `${pos}%` }}
              >
                <span className="glass-strong absolute top-1/2 left-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full">
                  <MoveHorizontal className="size-5 text-foreground" />
                </span>
              </div>
            </div>
          </div>

          {/* Accessible control */}
          <label className="mt-5 flex items-center gap-3 px-1">
            <span className="text-xs text-muted-foreground">Csevegőappban</span>
            <input
              type="range"
              min={0}
              max={100}
              value={pos}
              onChange={(e) => setPos(Number(e.target.value))}
              aria-label="Összehasonlítás csúszka a csevegőappban összenyomott és a Fomióval feltöltött fotó között"
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-border accent-accent"
            />
            <span className="text-xs text-accent">Fomióval</span>
          </label>
        </Reveal>
      </div>
    </section>
  )
}
