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

export function readGuestName(): string {
  return read(NAME_KEY)?.trim() ?? ''
}

export function writeGuestName(name: string) {
  write(NAME_KEY, name.slice(0, GUEST_NAME_MAX_LENGTH))
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
