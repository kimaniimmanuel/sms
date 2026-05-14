import { z } from "zod";

/**
 * Roles supported in the SMS prototype. Additional roles (parent, director)
 * are roadmap.
 */
export const UserRole = z.enum(["teacher", "admin", "finance"]);
export type UserRole = z.infer<typeof UserRole>;

/**
 * User — cross-boundary shape. This schema is what the API exposes to clients
 * and what core-logic validates. Server-only fields (passwordHash, etc.) live
 * on the TypeORM entity inside apps/api and are deliberately omitted here.
 *
 * Every user is bound to exactly one tenant via `schoolId`.
 */
export const UserSchema = z
  .object({
    id: z.string().uuid(),
    schoolId: z.string().uuid(),
    name: z.string().min(1).max(255),
    phone: z
      .string()
      .regex(/^\+\d{6,15}$/, "phone must be E.164 (e.g. +254712345678)"),
    email: z.string().email().optional(),
    role: UserRole,
    deviceId: z.string().min(1).optional(),
    isActive: z.boolean().default(true),
    createdAt: z.coerce.date(),
  })
  .strict();

export type User = z.infer<typeof UserSchema>;
