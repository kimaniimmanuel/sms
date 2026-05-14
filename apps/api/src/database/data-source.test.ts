import "reflect-metadata";
import {
  AppDataSource,
  resolveLogging,
  resolveMigrations,
  resolveMigrationsGlob,
} from "./data-source.js";

describe("resolveLogging", () => {
  it("returns 'all' when LOG_LEVEL=debug", () => {
    expect(resolveLogging("debug")).toBe("all");
  });

  it("returns ['error','warn'] when LOG_LEVEL=info", () => {
    expect(resolveLogging("info")).toEqual(["error", "warn"]);
  });

  it("returns ['error','warn'] when LOG_LEVEL is unset", () => {
    expect(resolveLogging(undefined)).toEqual(["error", "warn"]);
  });
});

describe("resolveMigrationsGlob", () => {
  it("returns the dist .js glob in production", () => {
    expect(resolveMigrationsGlob("production")).toBe(
      "dist/database/migrations/*.js",
    );
  });

  it("returns the src .ts glob for development", () => {
    expect(resolveMigrationsGlob("development")).toBe(
      "src/database/migrations/*.ts",
    );
  });

  it("returns the src .ts glob when NODE_ENV is unset", () => {
    expect(resolveMigrationsGlob(undefined)).toBe(
      "src/database/migrations/*.ts",
    );
  });
});

describe("AppDataSource", () => {
  it("targets Postgres", () => {
    expect(AppDataSource.options.type).toBe("postgres");
  });

  it("has synchronize disabled (migration-only schema management)", () => {
    expect(AppDataSource.options.synchronize).toBe(false);
  });

  it("registers all expected entities", () => {
    const entities = AppDataSource.options.entities as Array<{ name: string }>;
    const names = entities.map((e) => e.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "Tenant",
        "User",
        "Student",
        "AccessToken",
        "Payment",
        "Attendance",
        "RefreshToken",
      ]),
    );
    expect(names).toHaveLength(7);
  });

  it("uses the _migrations table for migration tracking", () => {
    expect(AppDataSource.options.migrationsTableName).toBe("_migrations");
  });

  it("has a snake_case naming strategy configured", () => {
    expect(AppDataSource.options.namingStrategy).toBeDefined();
    expect(AppDataSource.options.namingStrategy?.constructor.name).toBe(
      "SnakeNamingStrategy",
    );
  });

  it("uses an array for migrations (empty under Jest, populated otherwise)", () => {
    expect(Array.isArray(AppDataSource.options.migrations)).toBe(true);
  });
});

describe("resolveMigrations", () => {
  it("returns an empty array under Jest (avoids dynamic-import loader)", () => {
    expect(resolveMigrations("production", true)).toEqual([]);
    expect(resolveMigrations(undefined, true)).toEqual([]);
  });

  it("returns a one-element array containing the appropriate glob otherwise", () => {
    expect(resolveMigrations("production", false)).toEqual([
      "dist/database/migrations/*.js",
    ]);
    expect(resolveMigrations(undefined, false)).toEqual([
      "src/database/migrations/*.ts",
    ]);
  });
});
