import "reflect-metadata";
import "dotenv/config";
import { DataSource, type LoggerOptions } from "typeorm";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";

import { Tenant } from "../tenants/tenant.entity.js";
import { User } from "../users/user.entity.js";
import { Student } from "../students/student.entity.js";
import { AccessToken } from "../access-tokens/access-token.entity.js";
import { Payment } from "../payments/payment.entity.js";
import { Attendance } from "../attendance/attendance.entity.js";
import { RefreshToken } from "../auth/refresh-token.entity.js";

/**
 * Pure helper: map LOG_LEVEL env value to TypeORM's logging option.
 *
 *   "debug"            → "all"             (every query logged)
 *   any other / unset  → ["error", "warn"] (only problems logged)
 *
 * Extracted so the branch is testable without mutating module state.
 */
export function resolveLogging(envLogLevel: string | undefined): LoggerOptions {
  return envLogLevel === "debug" ? "all" : ["error", "warn"];
}

/**
 * Pure helper: pick the migration glob based on NODE_ENV.
 *
 *   production → "dist/database/migrations/*.js"    (compiled, deployed)
 *   anything else → "src/database/migrations/*.ts"  (tsx runs TS directly)
 *
 * Including both at once causes TypeORM to flag every migration as a duplicate
 * the moment a `dist/` build also exists, so we deliberately commit to one.
 */
export function resolveMigrationsGlob(nodeEnv: string | undefined): string {
  return nodeEnv === "production"
    ? "dist/database/migrations/*.js"
    : "src/database/migrations/*.ts";
}

/**
 * Final migrations array passed to TypeORM. Returns `[]` under Jest because
 * TypeORM uses dynamic `import()` to load migration files, which Jest's
 * CommonJS transpile cannot resolve without `--experimental-vm-modules`.
 *
 * Tests run against an already-migrated DB; not loading the files into the
 * DataSource is purely a loader concession — it doesn't change behaviour.
 */
export function resolveMigrations(
  nodeEnv: string | undefined,
  isJestWorker: boolean,
): string[] {
  if (isJestWorker) return [];
  return [resolveMigrationsGlob(nodeEnv)];
}

/**
 * AppDataSource — the single TypeORM DataSource for the API.
 *
 * Wired in both runtime (NestJS module — Epic E4+) and the migration CLI
 * (`pnpm migration:run` etc.). `synchronize: false` is non-negotiable; schema
 * changes are migration-only across every environment to prevent silent drift.
 *
 * Naming strategy is snake_case: TS property `schoolId` → column `school_id`,
 * matching the SRS column names and Postgres convention.
 *
 * Migration globs are relative — TypeORM resolves them against `process.cwd()`
 * which is the package directory whenever `pnpm migration:*` runs from here.
 * Listing both `src/.../*.ts` and `dist/.../*.js` lets the same DataSource work
 * in dev (tsx running .ts) and in built/production (running compiled .js).
 */
export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  synchronize: false,
  logging: resolveLogging(process.env.LOG_LEVEL),
  namingStrategy: new SnakeNamingStrategy(),
  entities: [Tenant, User, Student, AccessToken, Payment, Attendance, RefreshToken],
  migrations: resolveMigrations(process.env.NODE_ENV, !!process.env.JEST_WORKER_ID),
  migrationsTableName: "_migrations",
});
