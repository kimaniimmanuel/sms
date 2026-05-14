import { v7 as uuidv7 } from "uuid";

/**
 * Generate a new UUID v7 identifier.
 *
 * UUID v7 (RFC 9562) embeds a Unix-millisecond timestamp in its leading bits,
 * making the IDs time-sortable while still being globally unique. This is the
 * canonical ID type for every SMS entity — never use auto-increment integers.
 *
 * Returns lowercase canonical form: 8-4-4-4-12 hex characters with version
 * nibble = 7 and variant bits set.
 *
 * @example
 *   newId(); // "01959be0-7d3a-7a4f-9b27-2d5a9f1c8a02"
 */
export function newId(): string {
  return uuidv7();
}
