// Browser APIs only. Importing this from a Server Component would compile
// fine and then fail at runtime on createImageBitmap; this makes it a build
// error instead, mirroring `server-only` on the query modules.
import 'client-only'

import { readCaptureTime } from './exif'

/**
 * Browser-side photo pipeline. Everything here runs on a guest's phone, on
 * venue wifi, with whatever memory the device has left.
 *
 * See `.cursor/skills/ourfilm-upload/SKILL.md` for why the numbers are what they
 * are. The short version: 4096px at q0.92 stays print-ready while cutting a
 * 48MP iPhone photo from ~8MB to under ~2.5MB.
 */

/** Long-edge cap. Also keeps the canvas under iOS Safari's ~16.7M pixel
 *  ceiling: a 4:3 photo at 4096 lands near 12.6M. Don't raise without
 *  rechecking that. */
const MAX_EDGE = 4096
const QUALITY = 0.92

/** Gallery tile. The grid must never load the full image — see CLAUDE.md. */
const THUMB_EDGE = 400
const THUMB_QUALITY = 0.8

export type PreparedPhoto = {
  full: Blob
  thumb: Blob
  /** Dimensions of `full`, stored so the gallery can reserve grid space. */
  width: number
  height: number
  /** When the shutter fired, or null when the file carried no EXIF — a
   *  screenshot, a download, or anything already through a chat app. */
  takenAt: Date | null
}

/**
 * Cheap synchronous HEIC check.
 *
 * `heic-to` exports its own async `isHeic` that sniffs magic bytes, but calling
 * it would mean importing the package — and the whole point is that guests
 * whose phones send JPEG never download the decoder at all. Name and MIME are
 * enough to decide whether to pay for it.
 *
 * The extension check is not redundant: HEIC files routinely arrive with an
 * empty `type` from Android pickers and from iOS share sheets.
 */
export function isHeic(file: File): boolean {
  return /image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name)
}

/**
 * Decode any accepted file to a bitmap with EXIF orientation baked into the
 * pixels, so a canvas re-encode cannot leave the photo sideways.
 *
 * The HEIC branch asks `heic-to` for a bitmap rather than a JPEG blob. The
 * skill sketches blob → `createImageBitmap`, but that encodes a full-size JPEG
 * and immediately decodes it again — two expensive passes over a 48MP image on
 * a phone, for an intermediate we throw away.
 */
async function decode(file: File): Promise<ImageBitmap> {
  if (isHeic(file)) {
    // Dynamic, and the /next entry specifically: it inlines its worker rather
    // than relying on the bundler emitting a separate asset.
    const { heicTo } = await import('heic-to/next')
    return heicTo({
      blob: file,
      type: 'bitmap',
      options: { imageOrientation: 'from-image' },
    })
  }

  return createImageBitmap(file, { imageOrientation: 'from-image' })
}

function scaledSize(bitmap: ImageBitmap, maxEdge: number) {
  // Never upscale: a small photo stays exactly as it is.
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  return {
    width: Math.round(bitmap.width * scale),
    height: Math.round(bitmap.height * scale),
  }
}

async function toJpeg(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  quality: number,
): Promise<Blob> {
  // OffscreenCanvas landed in Safari 16.4. Plenty of phones at a wedding are
  // older than that, and a guest whose upload silently fails is exactly the
  // data point this pilot cannot afford to lose.
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height)
    // Wide gamut. A 2D context is sRGB by default, which silently clips
    // everything a phone camera captures outside it — most visibly in skin
    // tones and foliage. Browsers without the option ignore it and fall back
    // to sRGB, so this is safe to ask for unconditionally.
    const ctx = canvas.getContext('2d', { colorSpace: 'display-p3' })
    if (!ctx) throw new Error('2D context unavailable')
    ctx.drawImage(bitmap, 0, 0, width, height)
    return canvas.convertToBlob({ type: 'image/jpeg', quality })
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { colorSpace: 'display-p3' })
  if (!ctx) throw new Error('2D context unavailable')
  ctx.drawImage(bitmap, 0, 0, width, height)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error('Canvas encoding failed')),
      'image/jpeg',
      quality,
    )
  })
}

/**
 * Decode once, encode twice. Producing the thumbnail from the bitmap already
 * in memory costs a resize rather than a second decode of a large file.
 *
 * Call this **sequentially** across a selection. A parallel loop over ten 48MP
 * photos will run mobile Safari out of memory and take the tab with it.
 */
export async function prepareForUpload(file: File): Promise<PreparedPhoto> {
  // Before `decode`, and emphatically before the re-encode below, which is what
  // destroys it. Reading it afterwards would always return null.
  const takenAt = await readCaptureTime(file)

  const bitmap = await decode(file)

  try {
    const { width, height } = scaledSize(bitmap, MAX_EDGE)

    // Always re-encode, even when the original is smaller than the result.
    //
    // Passing the guest's file through untouched to save bytes looks like a
    // free win and is not: the canvas round trip is what strips EXIF, and EXIF
    // is where the GPS coordinates live. The bucket is public and object URLs
    // are shareable, so an untouched original means a guest can hand over
    // where they were standing along with the photo.
    //
    // This is the common case, not an edge one — a phone JPEG at 4032px is
    // under the cap, so nothing is resized, and re-encoding an already
    // compressed JPEG at q0.92 usually produces a slightly larger file
    // (measured: 1.35MB in, 1.40MB out). Roughly 4% more bytes buys a
    // guarantee that no location data leaves the device.
    const full = await toJpeg(bitmap, width, height, QUALITY)

    const thumbSize = scaledSize(bitmap, THUMB_EDGE)
    const thumb = await toJpeg(
      bitmap,
      thumbSize.width,
      thumbSize.height,
      THUMB_QUALITY,
    )

    return { full, thumb, width, height, takenAt }
  } finally {
    // Phones are memory-tight and the next file is queued right behind this
    // one. Release in `finally` so a mid-pipeline throw cannot leak it.
    bitmap.close()
  }
}
