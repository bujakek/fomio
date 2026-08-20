/**
 * The company facts the legal pages need, in one place so the privacy notice
 * and the ÁSZF can never disagree with each other.
 *
 * **Every value marked TODO must be filled in before the pages are published.**
 * They are the details only the business has — a company register entry, a tax
 * number — and inventing them would be worse than leaving them visibly blank.
 * `hasRealCompanyDetails` below is what un-drafts the pages, so filling these
 * in and flipping that flag is the whole job.
 *
 * Hungarian law requires each of these on a consumer-facing service:
 * 45/2014. (II. 26.) Korm. rendelet 11. § and the Elker tv. (2001. évi CVIII.).
 */
export const COMPANY = {
  /** Full registered company name, e.g. "Példa Kft." */
  name: '[CÉGNÉV — TODO]',
  /** Registered seat, full postal address. */
  seat: '[SZÉKHELY — TODO]',
  /** Cégjegyzékszám, e.g. "01-09-123456". */
  registryNumber: '[CÉGJEGYZÉKSZÁM — TODO]',
  /** The court that registered the company, e.g. "Fővárosi Törvényszék Cégbírósága". */
  registryCourt: '[BEJEGYZŐ BÍRÓSÁG — TODO]',
  /** Adószám, e.g. "12345678-2-41". */
  taxNumber: '[ADÓSZÁM — TODO]',
  /** A reachable phone number. Required; an email address alone is not enough. */
  phone: '[TELEFONSZÁM — TODO]',
  /** Chamber of commerce, e.g. "Budapesti Kereskedelmi és Iparkamara". */
  chamber: '[SZAKMAI KAMARA — TODO]',
} as const

/** Hosting provider named in the ÁSZF, per the Elker tv. */
export const HOSTING_PROVIDER =
  'Vercel Inc. (340 S Lemon Ave #4133, Walnut, CA 91789, USA)'

/** Who sends the magic-link emails. Named as a processor in the privacy notice. */
export const EMAIL_PROVIDER = 'Resend'

/** Shown at the foot of both legal pages. Update when their text changes. */
export const LAST_UPDATED = '2026. augusztus 20.'

/**
 * Flips the legal pages out of draft: hides the DraftNotice banners and lets
 * them be indexed. Keep false until COMPANY above is real — publishing a
 * privacy notice with `[CÉGNÉV — TODO]` in it is worse than not publishing one.
 */
export const hasRealCompanyDetails = false
