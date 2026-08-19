/**
 * Everything the guest's own device remembers about them.
 *
 * There are no guest accounts, so this is the whole identity layer: a display
 * name and two "have we already asked?" flags. All of it is per-device and
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
const NAME_PROMPT_DISMISSED_KEY = 'ourfilm:name-prompt-dismissed'
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
 * Whether to ask for a name at all. False once they have given one *or*
 * declined once — a guest who said no should not be asked again at the next
 * event they attend, which is why this is not scoped per event.
 */
export function shouldAskForName(): boolean {
  return readGuestName() === '' && read(NAME_PROMPT_DISMISSED_KEY) !== '1'
}

export function dismissNamePrompt() {
  write(NAME_PROMPT_DISMISSED_KEY, '1')
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
