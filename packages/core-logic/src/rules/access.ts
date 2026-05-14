import type { AccessToken } from "../schemas/access.js";

/**
 * Pass — the three purchasable sync-access windows.
 */
export type Pass = "day" | "week" | "month";

/**
 * Roles that can purchase sync access directly. Finance users currently use
 * admin pricing in practice but `priceKES` is restricted to the two priced
 * roles per the business specification — extend explicitly when needed.
 */
export type PricedRole = "teacher" | "admin";

/**
 * Validity window length per pass, in hours.
 *
 *   day:   24 h
 *   week:  168 h  (7 days)
 *   month: 720 h  (30 days)
 *
 * These are the source of truth for token expiry calculations — never
 * hard-code these numbers anywhere else.
 */
export const PASS_DURATION_HOURS: Readonly<Record<Pass, number>> = Object.freeze({
  day: 24,
  week: 24 * 7,
  month: 24 * 30,
});

/**
 * Price table in KES per (role, pass) tuple.
 *
 *   teacher: day=10, week=50, month=150
 *   admin:   day=50, week=200, month=600
 */
export const PRICE_KES: Readonly<Record<PricedRole, Readonly<Record<Pass, number>>>> =
  Object.freeze({
    teacher: Object.freeze({ day: 10, week: 50, month: 150 }),
    admin: Object.freeze({ day: 50, week: 200, month: 600 }),
  });

/**
 * Hours of validity for a given pass. Used by the access-token service when
 * issuing a token: `validUntil = validFrom + accessDurationHours(pass) * 3600 * 1000`.
 *
 * Throws if pass is not one of `day | week | month`.
 */
export function accessDurationHours(pass: Pass): number {
  const hours = PASS_DURATION_HOURS[pass];
  if (hours === undefined) {
    throw new Error(`Unknown pass type: ${String(pass)}`);
  }
  return hours;
}

/**
 * Price in KES for a (role, pass) combination.
 *
 * Throws if either argument is not in the supported set. The error surfaces
 * misconfiguration early rather than silently charging the wrong amount.
 *
 * @example
 *   priceKES("teacher", "day");   // 10
 *   priceKES("admin",   "month"); // 600
 */
export function priceKES(role: PricedRole, pass: Pass): number {
  const rolePrices = PRICE_KES[role];
  if (rolePrices === undefined) {
    throw new Error(`No price table for role: ${String(role)}`);
  }
  const price = rolePrices[pass];
  if (price === undefined) {
    throw new Error(`No price for role=${role}, pass=${String(pass)}`);
  }
  return price;
}

/**
 * Returns true iff the access token is still valid at the given moment.
 *
 * Validity is **strict**: at the exact instant `now === token.validUntil`,
 * the token is treated as **expired**. This prevents an off-by-one race where
 * a request submitted at the expiry boundary sneaks through.
 *
 * @param token A parsed AccessToken (already validated by AccessTokenSchema).
 * @param now   The reference time. Defaults to the wall clock. Injectable for
 *              deterministic tests.
 */
export function isAccessValid(token: AccessToken, now: Date = new Date()): boolean {
  return token.validUntil.getTime() > now.getTime();
}
