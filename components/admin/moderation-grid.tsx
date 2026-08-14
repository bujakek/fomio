'use client'

import type { HostPhoto } from '@/lib/photos'
import { photoPublicUrl } from '@/lib/storage'
import { cn } from '@/lib/utils'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { useTransition, useState } from 'react'
import { setPhotoHidden } from '@/app/admin/events/[slug]/actions'

function Tile({ photo, slug }: { photo: HostPhoto; slug: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState(false)
  const hidden = photo.hidden_at !== null

  return (
    <li className="relative">
      <div
        className={cn(
          'relative aspect-square overflow-hidden rounded-2xl transition-opacity',
          hidden && 'opacity-35',
        )}
      >
        <Image
          src={photoPublicUrl(photo.thumb_path)}
          alt={
            photo.uploader_name
              ? `${photo.uploader_name} fotója`
              : 'Egy vendég fotója'
          }
          fill
          sizes="(max-width: 640px) 50vw, 200px"
          unoptimized
          className="object-cover"
        />
      </div>

      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(false)
            try {
              await setPhotoHidden(slug, photo.id, !hidden)
            } catch {
              setError(true)
            }
          })
        }
        aria-pressed={hidden}
        aria-label={hidden ? 'Kép visszaállítása' : 'Kép elrejtése'}
        className="glass-strong absolute right-2 bottom-2 flex size-11 items-center justify-center rounded-full text-foreground disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : hidden ? (
          <Eye className="size-4" />
        ) : (
          <EyeOff className="size-4" />
        )}
      </button>

      {error ? (
        <p className="text-destructive mt-1 text-xs">Nem sikerült</p>
      ) : null}
      {hidden ? (
        <p className="mt-1 text-center text-xs text-muted-foreground">Rejtve</p>
      ) : null}
    </li>
  )
}

export function ModerationGrid({
  photos,
  slug,
}: {
  photos: HostPhoto[]
  slug: string
}) {
  if (photos.length === 0) {
    return (
      <p className="glass rounded-2xl px-5 py-6 text-center text-sm text-muted-foreground">
        Még nem érkezett kép.
      </p>
    )
  }

  const hiddenCount = photos.filter((p) => p.hidden_at !== null).length

  return (
    <>
      <p className="mb-3 text-sm text-muted-foreground">
        {photos.length} kép
        {hiddenCount > 0 ? ` · ${hiddenCount} rejtve` : ''}
      </p>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {photos.map((photo) => (
          <Tile key={photo.id} photo={photo} slug={slug} />
        ))}
      </ul>
    </>
  )
}
