import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Initial schema: tenants, users, students.
 *
 * Hard rules embedded here:
 *   - id is UUID (client-generated v7); never SERIAL or `gen_random_uuid()` default
 *   - school_id on every tenant-scoped table; FK to tenants(id) ON DELETE CASCADE
 *   - phone is unique within a tenant (composite unique on school_id + phone)
 */
export class InitialTenantsUsersStudents1778716800001 implements MigrationInterface {
  name = "InitialTenantsUsersStudents1778716800001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tenants" (
        "id"               uuid PRIMARY KEY,
        "school_name"      varchar(255) NOT NULL,
        "tier"             varchar(50)  NOT NULL DEFAULT 'offline',
        "contact_name"     varchar(255),
        "contact_phone"    varchar(20),
        "flat_fee_status"  varchar(20)  NOT NULL DEFAULT 'inactive',
        "created_at"       timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT "chk_tenants_tier"            CHECK ("tier" IN ('offline', 'sync-enabled')),
        CONSTRAINT "chk_tenants_flat_fee_status" CHECK ("flat_fee_status" IN ('inactive', 'active', 'suspended'))
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"             uuid PRIMARY KEY,
        "school_id"      uuid         NOT NULL,
        "name"           varchar(255) NOT NULL,
        "phone"          varchar(20)  NOT NULL,
        "email"          varchar(255),
        "role"           varchar(50)  NOT NULL,
        "password_hash"  varchar(255) NOT NULL,
        "device_id"      varchar(255),
        "is_active"      boolean      NOT NULL DEFAULT true,
        "created_at"     timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT "chk_users_role" CHECK ("role" IN ('teacher', 'admin', 'finance')),
        CONSTRAINT "fk_users_school" FOREIGN KEY ("school_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_users_school" ON "users" ("school_id")`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_users_school_phone" ON "users" ("school_id", "phone")`,
    );

    await queryRunner.query(`
      CREATE TABLE "students" (
        "id"             uuid PRIMARY KEY,
        "school_id"      uuid         NOT NULL,
        "name"           varchar(255) NOT NULL,
        "grade"          varchar(50)  NOT NULL,
        "date_of_birth"  date,
        "guardian_phone" varchar(20),
        "is_archived"    boolean      NOT NULL DEFAULT false,
        "created_at"     timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT "fk_students_school" FOREIGN KEY ("school_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_students_school" ON "students" ("school_id")`);
    await queryRunner.query(
      `CREATE INDEX "idx_students_school_grade" ON "students" ("school_id", "grade")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop in reverse FK order
    await queryRunner.query(`DROP TABLE IF EXISTS "students"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenants"`);
  }
}
