'use client'

import { useEffect } from 'react'

import { completeMagicLink } from './actions'

let started = false

/**
 * Kicks off the session exchange once the signing-in UI is on screen.
 *
 * The module-level guard is load-bearing: React Strict Mode remounts in
 * development, and a magic-link `code` is single-use. A second call would
 * burn the code the first one is still redeeming.
 */
export function CallbackExchange() {
  useEffect(() => {
    if (started) return
    started = true

    const params = new URLSearchParams(window.location.search)
    void completeMagicLink({
      code: params.get('code'),
      tokenHash: params.get('token_hash'),
      type: params.get('type'),
      next: params.get('next'),
    })
  }, [])

  return null
}
