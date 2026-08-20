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

/**
 * The zone an event's clock times are rendered in.
 *
 * Unlike `event_date` above, a `timestamptz` is an exact instant, so showing it
 * needs *a* zone — and pinning to UTC would be the bug rather than the fix,
 * labelling a photo taken at 14:32 as 12:32. Vercel runs UTC, so the server's
 * own zone is no help either.
 *
 * The product is Hungarian-only and the pilot is one Hungarian wedding, so the
 * event's zone is Budapest. If OurFilm ever runs an event elsewhere this
 * becomes a column on `events` — a wider guess would not be an improvement.
 */
export const EVENT_TIME_ZONE = 'Europe/Budapest'

const EVENT_PARTS = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  // h23 rather than hour12:false — the latter renders midnight as 24 under some
  // ICU builds, which would sort a photo to the wrong end of the day.
  hourCycle: 'h23',
  timeZone: EVENT_TIME_ZONE,
})

function eventParts(iso: string) {
  const found = Object.fromEntries(
    EVENT_PARTS.formatToParts(new Date(iso)).map((part) => [
      part.type,
      part.value,
    ]),
  )
  return found as Record<
    'year' | 'month' | 'day' | 'hour' | 'minute' | 'second',
    string
  >
}

/**
 * `2026-08-15_1432`, for filenames inside the album ZIP.
 *
 * Sorts chronologically as plain text, and keeps meaning once a file is dragged
 * out of the folder and away from its numbering.
 */
export function formatFileStamp(iso: string): string {
  const p = eventParts(iso)
  return `${p.year}-${p.month}-${p.day}_${p.hour}${p.minute}`
}

/** `2026:08:15 14:32:10` — the EXIF spelling of a timestamp, in the event's
 *  zone. Colons in the date half are not a typo; that is the format. */
export function eventStamp(iso: string): string {
  const p = eventParts(iso)
  return `${p.year}:${p.month}:${p.day} ${p.hour}:${p.minute}:${p.second}`
}

const OFFSET = new Intl.DateTimeFormat('en-US', {
  timeZone: EVENT_TIME_ZONE,
  timeZoneName: 'longOffset',
})

/**
 * `+02:00` — the event zone's UTC offset **on that date**, which is the whole
 * reason this is computed per timestamp rather than stored as a constant.
 * Budapest is +01:00 in January and +02:00 in July, so a wedding and a
 * Christmas party cannot share one answer.
 */
export function eventUtcOffset(iso: string): string {
  const name = OFFSET.formatToParts(new Date(iso)).find(
    (part) => part.type === 'timeZoneName',
  )?.value
  // A zone sitting exactly on UTC formats as a bare "GMT" with no offset.
  const found = name ? /GMT([+-]\d{2}:\d{2})/.exec(name) : null
  return found ? found[1] : '+00:00'
}

/**
 * The same instant as a `Date` whose **local** fields read as the event's wall
 * clock.
 *
 * For a ZIP entry, not for display. A ZIP stores modification times as a DOS
 * timestamp, which carries no timezone at all — the archiver just writes the
 * `Date`'s local components, so the answer depends on the server's clock. That
 * is fine on a laptop in Budapest and wrong on Vercel, which runs UTC and would
 * label a photo taken at 14:32 as 12:32.
 *
 * Shifting the instant looks like a hack and is the opposite: a zone-less
 * timestamp means wall clock, so wall clock is what has to go in.
 */
export function eventWallClock(iso: string): Date {
  const p = eventParts(iso)
  return new Date(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour),
    Number(p.minute),
    Number(p.second),
  )
}

const HU_MOMENT = new Intl.DateTimeFormat('hu-HU', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: EVENT_TIME_ZONE,
})

/**
 * `2026. augusztus 20. 14:32` — an exact instant rendered in the event's zone.
 *
 * Unlike `formatEventDate`, which pins to UTC because a `date` column has no
 * time to get wrong, this takes a `timestamptz` and so must pick a zone. UTC
 * would be the bug rather than the fix here: a payment made at 00:30 Budapest
 * time would show on the previous day's receipt.
 */
export function formatMoment(iso: string): string {
  return HU_MOMENT.format(new Date(iso))
}
