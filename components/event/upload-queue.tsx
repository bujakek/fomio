'use client'

import { CreateOwnAlbum } from '@/components/event/create-own-album'
import {
  GUEST_NAME_MAX_LENGTH,
  markUploadedTo,
  readGuestName,
  writeGuestName,
} from '@/lib/guest-name'
import { prepareForUpload, type PreparedPhoto } from '@/lib/image'
import { uploadPhoto } from '@/lib/upload-photo'
import { cn } from '@/lib/utils'
import {
  AlertCircle,
  Check,
  ImagePlus,
  Images,
  Loader2,
  RotateCw,
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

/** Keep `.heic`/`.heif` listed. Excluding them makes iOS hand over a
 *  transcoded JPEG sometimes, but on other paths it just makes the file
 *  unselectable — a guest tapping a photo that refuses to be picked has no
 *  idea why. We convert them ourselves regardless. */
const ACCEPT = 'image/jpeg,image/png,image/webp,.heic,.heif'

type Status = 'queued' | 'preparing' | 'uploading' | 'done' | 'error'

type Item = {
  key: string
  file: File
  previewUrl: string
  status: Status
  error?: string
}

const STATUS_LABEL: Record<Status, string> = {
  queued: 'várakozik',
  preparing: 'feltöltés…',
  uploading: 'feltöltés…',
  done: 'kész',
  error: 'nem sikerült',
}

const isBusy = (s: Status) =>
  s === 'queued' || s === 'preparing' || s === 'uploading'

export function UploadQueue({
  eventId,
  slug,
  galleryPrivate,
}: {
  eventId: string
  slug: string
  galleryPrivate: boolean
}) {
  const [items, setItems] = useState<Item[]>([])
  const itemsRef = useRef<Item[]>([])
  const runningRef = useRef(false)
  const nameRef = useRef<HTMLInputElement>(null)

  // The nickname is deliberately not React state. It is only read at upload
  // time, and holding it in state would mean either seeding it during render
  // (localStorage does not exist on the server, so: hydration mismatch) or
  // setting state inside an effect, which cascades a second render on every
  // mount. Writing straight to the input avoids both.
  useEffect(() => {
    const stored = readGuestName()
    if (stored && nameRef.current) nameRef.current.value = stored
  }, [])

  // Revoke previews on unmount. Object URLs live until the document dies, so
  // a guest who uploads forty photos and stays on the page would otherwise
  // pin forty full-size images in memory on a phone.
  useEffect(
    () => () => {
      itemsRef.current.forEach((i) => URL.revokeObjectURL(i.previewUrl))
    },
    [],
  )

  const busy = items.some((i) => isBusy(i.status))

  // Uploads are not resumable — navigating away mid-queue loses the rest.
  useEffect(() => {
    if (!busy) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [busy])

  // Ref and state move together, synchronously. runQueue scans the ref to pick
  // the next file and cannot wait for a React commit: with a prepare running
  // ahead of an upload there are two scans inside one render, and a stale ref
  // would hand both of them the same photo.
  const patch = useCallback((key: string, next: Partial<Item>) => {
    itemsRef.current = itemsRef.current.map((i) =>
      i.key === key ? { ...i, ...next } : i,
    )
    setItems(itemsRef.current)
  }, [])

  const runQueue = useCallback(async () => {
    if (runningRef.current) return
    runningRef.current = true

    const reason = (e: unknown) =>
      e instanceof Error ? e.message : 'Ismeretlen hiba'

    // Claim the next queued file and start decoding it. Marking it `preparing`
    // is what stops the following scan claiming the same one.
    const startNext = () => {
      const item = itemsRef.current.find((i) => i.status === 'queued')
      if (!item) return null

      patch(item.key, { status: 'preparing', error: undefined })
      const work = prepareForUpload(item.file)
      // Awaited an upload later, so a rejection would otherwise spend that
      // whole window looking unhandled to the browser. This observes it
      // without consuming it — the await still sees the rejection.
      work.catch(() => {})
      return { item, work }
    }

    try {
      let ahead: { item: Item; work: Promise<PreparedPhoto> } | null = null

      for (;;) {
        // Scan here rather than trusting the lookahead below: files the guest
        // added while the previous photo was uploading are only visible now.
        ahead ??= startNext()
        if (!ahead) break

        const { item, work } = ahead
        ahead = null

        let prepared: PreparedPhoto
        try {
          prepared = await work
        } catch (e) {
          patch(item.key, { status: 'error', error: reason(e) })
          continue
        }

        patch(item.key, { status: 'uploading' })

        // The point of the exercise: start decoding the next photo now, so the
        // CPU chews through it while this one is on the wire. Uploads dominate
        // on venue wifi and the two used to strictly alternate, leaving the
        // radio idle through every decode and the CPU idle through every send.
        //
        // Depth of exactly one. Two decodes at once is what runs mobile Safari
        // out of memory, and one photo already prepared is at most a couple of
        // megabytes of blob waiting its turn.
        ahead = startNext()

        try {
          await uploadPhoto({
            eventId,
            prepared,
            uploaderName: nameRef.current?.value.trim() || null,
          })
          patch(item.key, { status: 'done' })
          markUploadedTo(eventId)
        } catch (e) {
          patch(item.key, { status: 'error', error: reason(e) })
        }
      }
    } finally {
      // Nothing awaits between the scan that ends the loop and this line, so a
      // file added by the guest cannot slip in behind a still-true flag.
      runningRef.current = false
    }
  }, [eventId, patch])

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return
    const added: Item[] = Array.from(files).map((file) => ({
      key: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'queued' as const,
    }))
    itemsRef.current = [...itemsRef.current, ...added]
    setItems(itemsRef.current)
    void runQueue()
  }

  const retry = (key: string) => {
    patch(key, { status: 'queued', error: undefined })
    void runQueue()
  }

  const doneCount = items.filter((i) => i.status === 'done').length
  const failedCount = items.filter((i) => i.status === 'error').length
  const allSettled = items.length > 0 && !busy

  return (
    <div className="flex flex-col gap-6">
      <div>
        <label
          htmlFor="uploader-name"
          className="mb-2 block text-sm text-muted-foreground"
        >
          A neved — nem kötelező
        </label>
        <input
          id="uploader-name"
          ref={nameRef}
          type="text"
          defaultValue=""
          maxLength={GUEST_NAME_MAX_LENGTH}
          autoComplete="name"
          placeholder="Például: Réka"
          onChange={(e) => writeGuestName(e.target.value)}
          className="glass min-h-14 w-full rounded-2xl px-5 text-base text-foreground transition-colors outline-none placeholder:text-muted-foreground/60 focus:border-accent"
        />
      </div>

      {allSettled && doneCount > 0 ? (
        <div className="glass-strong flex flex-col items-center gap-3 rounded-3xl px-6 py-8 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-accent/20">
            <Check className="size-7 text-accent" strokeWidth={2.2} />
          </span>
          <p className="text-xl font-semibold tracking-tight">
            {doneCount === 1
              ? 'Megvan! A képed felkerült.'
              : `Megvan! ${doneCount} képed felkerült.`}
          </p>
          <p className="max-w-xs text-sm leading-relaxed text-pretty text-muted-foreground">
            {galleryPrivate
              ? 'A galériát a házigazda egyelőre elrejtette — a képeid megvannak, és akkor lesznek láthatók, amikor megnyitja az albumot.'
              : 'Köszönjük, hogy megosztottad! Nézd meg, mit töltöttek fel a többiek.'}
          </p>
          {!galleryPrivate ? (
            <Link
              href={`/e/${slug}/gallery`}
              className="glass glass-hover mt-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold"
            >
              <Images className="size-4" strokeWidth={1.8} />
              Galéria megtekintése
            </Link>
          ) : null}

          {/* `alwaysShow`: the upload that qualifies them just happened, so
              there is no need to re-read the flag we only just wrote. */}
          <div className="w-full text-left">
            <CreateOwnAlbum eventId={eventId} alwaysShow />
          </div>
        </div>
      ) : null}

      {items.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.key}
              className="glass flex items-center gap-3 rounded-2xl p-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element --
                  a blob: URL has no intrinsic remote source for next/image to
                  optimise, and these are transient previews. */}
              <img
                src={item.previewUrl}
                alt=""
                className="size-14 shrink-0 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.file.name}</p>
                <p
                  className={cn(
                    'flex items-center gap-1.5 text-xs',
                    item.status === 'error'
                      ? 'text-destructive'
                      : 'text-muted-foreground',
                  )}
                >
                  {item.status === 'preparing' ||
                  item.status === 'uploading' ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : null}
                  {item.status === 'done' ? (
                    <Check className="size-3 text-accent" />
                  ) : null}
                  {item.status === 'error' ? (
                    <AlertCircle className="size-3" />
                  ) : null}
                  {STATUS_LABEL[item.status]}
                </p>
              </div>
              {item.status === 'error' ? (
                <button
                  type="button"
                  onClick={() => retry(item.key)}
                  className="glass glass-hover flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-xs font-semibold"
                >
                  <RotateCw className="size-3.5" />
                  Újra
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {failedCount > 0 && !busy ? (
        <p className="text-center text-sm text-muted-foreground">
          {failedCount} kép nem sikerült. Koppints az „Újra” gombra — a
          feltöltés ott folytatódik, ahol abbamaradt.
        </p>
      ) : null}

      <label
        className={cn(
          'btn-shine inline-flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-7 text-base font-semibold text-primary-foreground transition-transform',
          busy ? 'pointer-events-none opacity-60' : 'hover:scale-[1.02]',
        )}
      >
        <ImagePlus className="size-5" strokeWidth={1.8} />
        {busy
          ? 'Feltöltés folyamatban…'
          : items.length > 0
            ? 'Még több kép'
            : 'Képek kiválasztása'}
        <input
          type="file"
          accept={ACCEPT}
          multiple
          disabled={busy}
          className="sr-only"
          onChange={(e) => {
            addFiles(e.target.files)
            // Reset so picking the same file twice still fires a change.
            e.target.value = ''
          }}
        />
      </label>

      {busy ? (
        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          Ne zárd be az oldalt, amíg a feltöltés tart.
        </p>
      ) : null}
    </div>
  )
}
