'use client'

import { setGalleryHidden } from '@/app/admin/events/[slug]/actions'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { useState, useTransition } from 'react'

/**
 * Opens and closes the gallery to guests. Uploads are unaffected either way,
 * which the copy has to say plainly — "hidden" reads like "closed" otherwise,
 * and a host who wants a reveal at the end of the night needs to know guests
 * can still contribute while it is off.
 */
export function GalleryToggle({
  slug,
  hidden,
}: {
  slug: string
  hidden: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState(false)

  return (
    <div className="glass rounded-2xl px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-medium">Galéria láthatósága</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {hidden
              ? 'A vendégek most nem látják az albumot. Feltölteni továbbra is tudnak.'
              : 'A vendégek látják az albumot.'}
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={!hidden}
          aria-label="Galéria láthatósága"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(false)
              try {
                await setGalleryHidden(slug, !hidden)
              } catch {
                setError(true)
              }
            })
          }
          className={cn(
            'relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors disabled:opacity-60',
            hidden ? 'bg-white/10' : 'bg-accent/70',
          )}
        >
          <span
            className={cn(
              'absolute flex size-6 items-center justify-center rounded-full bg-white transition-transform',
              hidden ? 'translate-x-1' : 'translate-x-7',
            )}
          >
            {pending ? (
              <Loader2 className="size-3 animate-spin text-black/60" />
            ) : null}
          </span>
        </button>
      </div>

      {error ? (
        <p className="text-destructive mt-2 text-xs">
          Nem sikerült módosítani.
        </p>
      ) : null}
    </div>
  )
}
