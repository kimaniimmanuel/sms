import { z } from "zod";
import { UserRole } from "./user.js";

/**
 * AccessToken — time-bound sync authorisation, issued after a successful
 * M-Pesa payment (or by an admin via the manual-issuance flow for flat-fee
 * onboarding).
 *
 * `paymentRef` is the Daraja MpesaReceiptNumber for paid tokens, or a synthetic
 * value like `"flat-fee:2026-05"` for admin-issued tokens.
 *
 * Validity check: `isAccessValid(token)` returns true iff `validUntil > now`.
 * The boundary is strict: at exactly `validUntil`, access has expired.
 */
export const AccessTokenSchema = z
  .object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    schoolId: z.string().uuid(),
    role: UserRole,
    validFrom: z.coerce.date(),
    validUntil: z.coerce.date(),
    paymentRef: z.string().min(1),
    createdAt: z.coerce.date(),
  })
  .strict()
  .refine((t) => t.validUntil.getTime() > t.validFrom.getTime(), {
    message: "validUntil must be after validFrom",
    path: ["validUntil"],
  });

export type AccessToken = z.infer<typeof AccessTokenSchema>;
