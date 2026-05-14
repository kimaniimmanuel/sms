/**
 * Kenyan school terms.
 * - term1: January–April
 * - term2: May–August
 * - term3: September–December
 *
 * These ranges are coarse defaults. The Ministry of Education term calendar
 * shifts slightly each year; a future enhancement can take an exact term
 * calendar table per academic year and look up the precise term.
 */
export type Term = "term1" | "term2" | "term3";

/**
 * Returns the Kenyan school term for a given date.
 *
 * @param date Any JavaScript Date. The month is read from the local timezone;
 *             callers wanting strict UTC interpretation should pass a
 *             UTC-constructed date or use the underlying month boundaries.
 * @example
 *   termFromDate(new Date("2026-03-15")); // "term1"
 *   termFromDate(new Date("2026-05-01")); // "term2"
 *   termFromDate(new Date("2026-09-01")); // "term3"
 */
export function termFromDate(date: Date): Term {
  const month = date.getMonth(); // 0-indexed: 0 = Jan, 11 = Dec
  if (month <= 3) return "term1"; // Jan – Apr
  if (month <= 7) return "term2"; // May – Aug
  return "term3"; // Sep – Dec
}
