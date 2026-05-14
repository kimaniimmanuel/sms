import { Injectable } from "@nestjs/common";
import bcrypt from "bcrypt";

/**
 * BCRYPT_COST is exported so tests can assert it's ≥ 12 (NFR-SEC-002).
 * Bump alongside any future security review.
 */
export const BCRYPT_COST = 12;

/**
 * Wrapper around bcrypt for password handling.
 *
 * Hashing is intentionally slow (cost 12 ≈ ~250ms on modern hardware) — that's
 * the point. Never log either argument; never persist a plaintext password.
 */
@Injectable()
export class PasswordService {
  /**
   * Hash a plaintext password. Returns the bcrypt digest including salt and
   * cost prefix (e.g. `$2b$12$...`).
   */
  async hash(plaintext: string): Promise<string> {
    return bcrypt.hash(plaintext, BCRYPT_COST);
  }

  /**
   * Compare a plaintext password against a stored bcrypt digest. Constant-time
   * under the hood (`bcrypt.compare` uses a constant-time string comparison).
   */
  async compare(plaintext: string, digest: string): Promise<boolean> {
    return bcrypt.compare(plaintext, digest);
  }
}
