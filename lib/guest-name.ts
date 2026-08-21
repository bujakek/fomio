/**
 * Everything the guest's own device remembers about them.
 *
 * There are no guest accounts, so this is the whole identity layer: a display
 * name and two "have we already done this?" flags. All of it is per-device and
 * disposable — clearing site data resets a guest completely, which is the
 * correct blast radius for something a wedding guest never opted into.
 *
 * Every accessor swallows its errors. localStorage throws in Safari private
 * mode and when a device is out of quota, and none of these values is worth
 * breaking an upload over.
 */

/** Unchanged from the original inline constant — guests already have values
 *  stored under this key and renaming it would silently forget them. */
const NAME_KEY = 'ourfilm:uploader-name'

/**
 * The name, mirrored into a cookie so the **server** can see it.
 *
 * localStorage alone forced the gate to be decided in the browser: the server
 * had to render the gate every time, ship it, hydrate, read localStorage a
 * tick later and swap. A guest who had already joined paid a full render plus
 * a visible flash on every single navigation, and the album they had not yet
 * unlocked was serialised into the flight payload regardless.
 *
 * A cookie is the one piece of client state a Server Component can read, so
 * the gate decision moves to the first byte of HTML. localStorage stays the
 * source of truth for the client-side readers that already exist; this rides
 * alongside it.
 *
 * Still **not access control**. A cookie is typed as easily as it is read, and
 * privacy here rests entirely on the unguessable slug — see `hasGuestName`.
 */
export const GUEST_NAME_COOKIE = 'ourfilm_name'

/** A wedding is not a session. The album outlives the browser tab, and a guest
 *  re-scanning the QR at the reception should not meet the gate twice. */
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365
const UPSELL_DISMISSED_KEY = 'ourfilm:upsell-dismissed'
const UPLOADED_KEY_PREFIX = 'ourfilm:uploaded:'

/** Shown wherever a photo has no name attached. */
export const GUEST_FALLBACK_NAME = 'Vendég'

/** Matches the `maxLength` on every input that writes a name. */
export const GUEST_NAME_MAX_LENGTH = 40

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Private mode or quota. The name is a nicety; losing it is not an error.
  }
}

function readCookie(name: string): string | null {
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
    return match?.[1] ? decodeURIComponent(match[1]) : null
  } catch {
    return null
  }
}

/**
 * Falls back to the cookie because the two can genuinely disagree: Safari in
 * private mode throws on localStorage while still accepting cookies, and a
 * guest who joined before the cookie existed has the mirror image. Whichever
 * one survived is the name the guest typed.
 */
export function readGuestName(): string {
  return (read(NAME_KEY) ?? readCookie(GUEST_NAME_COOKIE))?.trim() ?? ''
}

export function writeGuestName(name: string) {
  const trimmed = name.slice(0, GUEST_NAME_MAX_LENGTH)
  write(NAME_KEY, trimmed)

  try {
    // `Lax` rather than `Strict`: guests arrive from a QR scanner, a WhatsApp
    // thread or a messages app, and `Strict` withholds the cookie on exactly
    // those cross-site entries — which is every way a guest actually reaches
    // an album. Getting it wrong shows the gate again to someone who joined.
    document.cookie =
      `${GUEST_NAME_COOKIE}=${encodeURIComponent(trimmed)}` +
      `; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; samesite=lax`
  } catch {
    // Same posture as localStorage above: the name is a nicety, and a guest
    // who cannot store it still gets the client-side gate.
  }
}

/**
 * Whether this device has joined. The join gate has no skip, so this is the
 * only thing standing between a guest and the album — and it stands there in
 * localStorage, which means it is a **UX gate, not access control**. The album
 * data is still reachable by anyone holding the link; clearing site data walks
 * straight past this. Nothing here protects anything.
 *
 * Not scoped per event: a guest who gave a name at one wedding is not asked
 * again at the next.
 */
export function hasGuestName(): boolean {
  return readGuestName() !== ''
}

/**
 * Whether this device has uploaded to this event. Scoped per event because it
 * gates the "make your own album" card, which should follow a guest's *first*
 * upload at each event rather than firing once ever.
 */
export function hasUploadedTo(eventId: string): boolean {
  return read(UPLOADED_KEY_PREFIX + eventId) === '1'
}

export function markUploadedTo(eventId: string) {
  write(UPLOADED_KEY_PREFIX + eventId, '1')
}

/** The upsell is dismissed globally: no is no, at every event. */
export function upsellDismissed(): boolean {
  return read(UPSELL_DISMISSED_KEY) === '1'
}

export function dismissUpsell() {
  write(UPSELL_DISMISSED_KEY, '1')
}
