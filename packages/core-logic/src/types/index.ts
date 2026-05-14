/**
 * Re-export of inferred Zod types, kept in one module for ergonomic imports:
 *
 *   import type { Tenant, User, Student, AccessToken, Pass } from "@sms/core-logic/types";
 */
export type { Tenant } from "../schemas/tenant.js";
export type { User, UserRole } from "../schemas/user.js";
export type { Student } from "../schemas/student.js";
export type { AccessToken } from "../schemas/access.js";
export type { Pass, PricedRole } from "../rules/access.js";
export type { Term } from "../utils/date.js";
