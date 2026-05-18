/**
 * Pure helpers for the Daraja API. Kept separate from DarajaService so they
 * can be unit-tested without any HTTP mocking.
 */

/**
 * Daraja timestamp format: YYYYMMDDHHMMSS in EAT (UTC+3).
 * Safaricom is strict about this — no separators, no timezone suffix.
 *
 * @example
 *   formatStkTimestamp(new Date("2026-05-15T08:00:00Z"))  // "20260515110000"
 */
export function formatStkTimestamp(date: Date): string {
  // Use Africa/Nairobi to get the wall-clock components, then strip separators.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const lookup: Record<string, string> = {};
  for (const p of parts) lookup[p.type] = p.value;
  return `${lookup.year}${lookup.month}${lookup.day}${lookup.hour}${lookup.minute}${lookup.second}`;
}

/**
 * Daraja STK Push password = base64(shortcode + passkey + timestamp).
 * The shortcode and passkey come from the Daraja portal; timestamp must
 * match exactly the one sent in the request body.
 */
export function buildStkPassword(shortcode: string, passkey: string, timestamp: string): string {
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
}

/**
 * Normalise a Kenyan phone number to Daraja's expected `2547XXXXXXXX` form.
 *
 *   "+254712345678" → "254712345678"
 *   "0712345678"    → "254712345678"
 *   "254712345678"  → "254712345678"
 *
 * Throws on values that clearly aren't Kenyan mobile numbers — caller should
 * have validated at the DTO layer; this is a last-line safety net.
 */
export function normalizeKenyanPhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("254") && digits.length === 12) return digits;
  if (digits.startsWith("07") && digits.length === 10) return `254${digits.slice(1)}`;
  if (digits.startsWith("01") && digits.length === 10) return `254${digits.slice(1)}`;
  if (digits.startsWith("7") && digits.length === 9) return `254${digits}`;
  if (digits.startsWith("1") && digits.length === 9) return `254${digits}`;
  throw new Error(`Cannot normalize as Kenyan phone: ${input}`);
}

/**
 * Convenience: extract a value from Daraja's CallbackMetadata.Item array,
 * which has the shape `[{ Name: "MpesaReceiptNumber", Value: "NLJ7..." }, ...]`.
 */
export function getMetadataItem(
  items: Array<{ Name: string; Value?: string | number }>,
  name: string,
): string | number | undefined {
  return items.find((i) => i.Name === name)?.Value;
}
