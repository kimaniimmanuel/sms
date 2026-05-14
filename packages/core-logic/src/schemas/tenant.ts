import { z } from "zod";

/**
 * Tenant — one row per school.
 *
 * In the database this is the `tenants` table and its primary key column is
 * named `id` (referenced from other tables as `school_id`). At the Zod /
 * cross-boundary layer the field is also `id`, matching the DB shape directly;
 * downstream entities carry `schoolId` that points at this `id`.
 *
 * `tier` distinguishes offline-only schools from those with sync access.
 * `flatFeeStatus` controls whether admin users bypass per-sync access checks.
 */
export const TenantSchema = z
  .object({
    id: z.string().uuid(),
    schoolName: z.string().min(1).max(255),
    tier: z.enum(["offline", "sync-enabled"]).default("offline"),
    contactName: z.string().max(255).optional(),
    contactPhone: z
      .string()
      .regex(/^\+\d{6,15}$/, "phone must be E.164 (e.g. +254712345678)")
      .optional(),
    flatFeeStatus: z
      .enum(["inactive", "active", "suspended"])
      .default("inactive"),
    createdAt: z.coerce.date(),
  })
  .strict();

export type Tenant = z.infer<typeof TenantSchema>;
