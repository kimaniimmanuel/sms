/**
 * Africa/Nairobi (UTC+3) is the canonical timezone for Kenyan schools.
 * Centralised here so the rest of the codebase never hard-codes the string.
 */
export const KENYA_TZ = "Africa/Nairobi";

/**
 * Returns the current date in `YYYY-MM-DD` form within a given IANA timezone.
 *
 * Uses Intl with the `en-CA` locale because en-CA formats dates as
 * `YYYY-MM-DD` natively — no parsing or padding needed. Always stable.
 *
 * @param tz IANA timezone string (e.g. "Africa/Nairobi", "UTC").
 * @param now Reference moment. Defaults to `new Date()`. Injectable for tests.
 *
 * @example
 *   todayInTimeZone(KENYA_TZ);                       // "2026-05-15"
 *   todayInTimeZone("UTC", new Date("2026-05-15T22:00:00Z")); // "2026-05-15"
 *   todayInTimeZone("Africa/Nairobi", new Date("2026-05-15T22:00:00Z")); // "2026-05-16"
 */
export function todayInTimeZone(tz: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(now);
}
