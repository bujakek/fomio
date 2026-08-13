const HU_DATE = new Intl.DateTimeFormat('hu-HU', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
})

/**
 * Formats an `event_date` as `2026. június 13.`
 *
 * `event_date` is a Postgres `date` — a calendar day with no time and no zone,
 * arriving as `"2026-06-13"`. Parsing that gives UTC midnight, so formatting it
 * in any timezone behind UTC renders the *previous day*: a wedding on the 13th
 * shows up as június 12. Rendering happens on the server, whose timezone is not
 * ours to assume, so the formatter is pinned to UTC to stay deterministic.
 */
export function formatEventDate(date: string | null): string | null {
  if (!date) return null
  return HU_DATE.format(new Date(`${date}T00:00:00Z`))
}
