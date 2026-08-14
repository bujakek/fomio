'use client'

import type { GalleryPhoto } from '@/lib/photos'
import { photoPublicUrl } from '@/lib/storage'
import Image from 'next/image'
import { useState } from 'react'
import { Lightbox } from './lightbox'

export function PhotoGrid({ photos }: { photos: GalleryPhoto[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {photos.map((photo, i) => (
          <li key={photo.id}>
            <button
              type="button"
              onClick={() => setOpenIndex(i)}
              className="group relative block aspect-square w-full overflow-hidden rounded-2xl"
            >
              <Image
                // The tile, never the full image. A 4096px/~2MB file scaled
                // into a 180px box would mean a guest pulling well over a
                // gigabyte to scroll a full album — and blowing the storage
                // egress budget along the way.
                src={photoPublicUrl(photo.thumb_path)}
                alt={
                  photo.uploader_name
                    ? `${photo.uploader_name} fotója`
                    : 'Egy vendég fotója'
                }
                fill
                sizes="(max-width: 640px) 50vw, 33vw"
                // Already sized and compressed on the phone that produced it.
                unoptimized
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </button>
          </li>
        ))}
      </ul>

      {openIndex !== null ? (
        <Lightbox
          photos={photos}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onNavigate={setOpenIndex}
        />
      ) : null}
    </>
  )
}
