'use client'

import { isHeic, prepareForUpload } from '@/lib/image'
import { useEffect, useState } from 'react'

type Row = { name: string; detail: string; ok: boolean }

/** Build a test image in-browser. Fetching one would stall under Chrome's
 *  virtual-time headless mode, which never resolves real network requests. */
async function makeFile(
  w: number,
  h: number,
  type: string,
  name: string,
): Promise<File> {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, '#c3b6ff')
  g.addColorStop(1, '#0b0b0d')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  // some detail so the encoder has real work to do
  for (let i = 0; i < 200; i++) {
    ctx.fillStyle = `hsl(${(i * 37) % 360} 70% 60%)`
    ctx.fillRect(((i * 97) % w) - 20, ((i * 53) % h) - 20, 40, 40)
  }
  const blob = await new Promise<Blob>((res) =>
    canvas.toBlob((b) => res(b!), type, 0.95),
  )
  return new File([blob], name, { type })
}

export default function PipelineTest() {
  const [rows, setRows] = useState<Row[]>([])
  const [done, setDone] = useState(false)

  useEffect(() => {
    const out: Row[] = []
    const add = (name: string, ok: boolean, detail: string) =>
      out.push({ name, ok, detail })

    async function run() {
      add(
        'isHeic: .heic name, empty MIME',
        isHeic(new File([], 'IMG.heic')),
        '',
      )
      add(
        'isHeic: MIME only',
        isHeic(new File([], 'x', { type: 'image/heif' })),
        '',
      )
      add(
        'isHeic: plain jpeg is not heic',
        !isHeic(new File([], 'a.jpg', { type: 'image/jpeg' })),
        '',
      )

      // oversized: 5000px long edge must come back capped at 4096
      const big = await makeFile(5000, 2500, 'image/jpeg', 'big.jpg')
      const p = await prepareForUpload(big)
      add(
        'downscales to 4096 long edge',
        p.width === 4096,
        `${p.width}x${p.height}`,
      )
      add(
        'aspect ratio preserved',
        Math.abs(p.width / p.height - 2) < 0.01,
        `${(p.width / p.height).toFixed(3)} (want 2.000)`,
      )
      add(
        'full is jpeg',
        p.full.type === 'image/jpeg',
        `${(p.full.size / 1024).toFixed(0)}KB`,
      )

      const tb = await createImageBitmap(p.thumb)
      add(
        'thumb long edge is 400',
        Math.max(tb.width, tb.height) === 400,
        `${tb.width}x${tb.height}`,
      )
      add(
        'thumb much smaller than full',
        p.thumb.size < p.full.size / 4,
        `${(p.thumb.size / 1024).toFixed(0)}KB vs ${(p.full.size / 1024).toFixed(0)}KB`,
      )
      tb.close()

      // small source must not be upscaled
      const small = await makeFile(320, 240, 'image/jpeg', 'small.jpg')
      const s = await prepareForUpload(small)
      add(
        'never upscales',
        s.width === 320 && s.height === 240,
        `${s.width}x${s.height}`,
      )

      // non-jpeg input converts
      const png = await makeFile(800, 600, 'image/png', 'a.png')
      const pr = await prepareForUpload(png)
      add(
        'png input becomes jpeg',
        pr.full.type === 'image/jpeg',
        `${pr.width}x${pr.height}`,
      )

      // Chrome writes a 456-byte sRGB profile and a larger one for Display P3,
      // so the APP2 length tells us whether the colorSpace hint was honoured.
      const bytes = new Uint8Array(await pr.full.slice(0, 8192).arrayBuffer())
      let iccLen = 0
      for (let i = 0; i < bytes.length - 16; i++) {
        if (
          bytes[i] === 0xff &&
          bytes[i + 1] === 0xe2 &&
          String.fromCharCode(...bytes.slice(i + 4, i + 15)) === 'ICC_PROFILE'
        ) {
          iccLen = ((bytes[i + 2] << 8) | bytes[i + 3]) - 16
          break
        }
      }
      add(
        'output is tagged wider than sRGB',
        iccLen > 460,
        `ICC ${iccLen} bytes (sRGB is 456)`,
      )

      add(
        'OffscreenCanvas available',
        typeof OffscreenCanvas !== 'undefined',
        typeof OffscreenCanvas !== 'undefined' ? 'yes' : 'fallback path',
      )

      setRows(out)
      setDone(true)
      void report(out)
    }

    const report = (r: Row[]) =>
      fetch('/pipeline-test/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passed: r.filter((x) => x.ok).length,
          total: r.length,
          rows: r,
        }),
      }).catch(() => {})

    run().catch((e) => {
      out.push({ name: 'threw', ok: false, detail: String(e) })
      setRows([...out])
      setDone(true)
      void report(out)
    })
  }, [])

  return (
    <main style={{ fontFamily: 'monospace', padding: 24, fontSize: 14 }}>
      <h1 id="status">{done ? 'DONE' : 'running…'}</h1>
      <ul>
        {rows.map((r) => (
          <li key={r.name} style={{ color: r.ok ? '#16a34a' : '#dc2626' }}>
            {r.ok ? 'PASS' : 'FAIL'} {r.name} {r.detail ? `— ${r.detail}` : ''}
          </li>
        ))}
      </ul>
      <p id="summary">
        {done ? `${rows.filter((r) => r.ok).length}/${rows.length} passed` : ''}
      </p>
    </main>
  )
}
