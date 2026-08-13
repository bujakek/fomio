/**
 * Canonical slug helper. Event slugs end up printed on physical QR cards, so
 * admin and the landing-page preview must produce byte-identical output.
 * Hungarian input is expected: diacritics are stripped, not transliterated.
 *
 * Deliberately deterministic and side-effect free: the landing page calls this
 * on every keystroke to render the QR preview, so randomness must not live
 * here. Use `generateEventSlug()` when creating a real event.
 */
export function slugify(input: string) {
  const base = input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
  return base || 'esemeny'
}

/**
 * Digits and lowercase letters with every visually confusable character
 * removed — no `0`/`o`, no `1`/`l`/`i`, and no `u` (it turns innocent random
 * strings into words nobody wants printed on a wedding invitation). Guests
 * retype these off a card in dim light, so a misread has to be impossible
 * rather than merely unlikely.
 */
const SUFFIX_ALPHABET = '23456789abcdefghjkmnpqrstvwxyz'

/** 30^6 ≈ 729 million. The album has no other lock on it — see below. */
const SUFFIX_LENGTH = 6

/**
 * Cryptographically random, with rejection sampling so the modulo does not
 * skew the distribution. `Math.random()` would be wrong here: this suffix *is*
 * the access control for the album, not a cosmetic id.
 */
function randomSuffix(length: number = SUFFIX_LENGTH) {
  // Largest multiple of the alphabet size that fits in a byte; anything at or
  // above it is discarded so every character stays equally likely.
  const ceiling =
    Math.floor(256 / SUFFIX_ALPHABET.length) * SUFFIX_ALPHABET.length
  const out: string[] = []
  const buffer = new Uint8Array(length * 2)

  while (out.length < length) {
    crypto.getRandomValues(buffer)
    for (const byte of buffer) {
      if (out.length === length) break
      if (byte >= ceiling) continue
      out.push(SUFFIX_ALPHABET[byte % SUFFIX_ALPHABET.length])
    }
  }

  return out.join('')
}

/**
 * The slug a real event gets. Guests reach the album with no login, no
 * passcode and no gate of any kind, so the URL is the only thing standing
 * between a wedding album and anyone who fancies guessing at it — and
 * `anna-peter` is guessable in minutes from a list of common first names.
 * The readable stem survives for the printed card; the suffix does the work.
 */
export function generateEventSlug(name: string) {
  return `${slugify(name)}-${randomSuffix()}`
}

/**
 * Fixed stand-in for the landing page's QR preview. The preview must show the
 * real URL *shape* — a live event slug carries a suffix, and a mockup that
 * quietly omits it teaches hosts to expect a URL they will never be given.
 */
export const EXAMPLE_SLUG_SUFFIX = 'k3f9x7'
