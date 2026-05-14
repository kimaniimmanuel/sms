/**
 * apps/api — NestJS multi-tenant API.
 *
 * Epic E3 lands the database layer: TypeORM DataSource, entities, and
 * migrations. NestJS bootstrap (main.ts, AppModule, guards) arrives in
 * Epic E4 onward.
 */
import { CORE_LOGIC_VERSION } from "@sms/core-logic";

export const API_VERSION = "0.3.0";
export const CORE_LOGIC = CORE_LOGIC_VERSION;

// Database layer
export { AppDataSource } from "./database/data-source.js";

// Entities
export { Tenant } from "./tenants/tenant.entity.js";
export { User } from "./users/user.entity.js";
export { Student } from "./students/student.entity.js";
export { AccessToken } from "./access-tokens/access-token.entity.js";
export { Payment } from "./payments/payment.entity.js";
export { Attendance } from "./attendance/attendance.entity.js";
