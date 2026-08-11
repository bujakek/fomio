/**
 * Canonical slug helper. Event slugs end up printed on physical QR cards, so
 * admin and the landing-page preview must produce byte-identical output.
 * Hungarian input is expected: diacritics are stripped, not transliterated.
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
