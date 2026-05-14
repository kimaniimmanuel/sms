import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * attendance — one row per (student, date).
 *
 * The composite unique on (student_id, date) is what makes the bulk-submit
 * endpoint (FR-ATT-001) safe to retry: identical resubmissions are upserts,
 * not duplicates.
 *
 * teacher_id uses ON DELETE RESTRICT so deactivating a teacher does not
 * silently destroy the audit trail of who took which attendance.
 */
export class Attendance1778716800003 implements MigrationInterface {
  name = "Attendance1778716800003";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "attendance" (
        "id"           uuid PRIMARY KEY,
        "school_id"    uuid         NOT NULL,
        "student_id"   uuid         NOT NULL,
        "teacher_id"   uuid         NOT NULL,
        "date"         date         NOT NULL,
        "status"       varchar(20)  NOT NULL,
        "note"         text,
        "synced_at"    timestamptz,
        "created_at"   timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT "chk_attendance_status"   CHECK ("status" IN ('present', 'absent', 'late')),
        CONSTRAINT "fk_attendance_school"    FOREIGN KEY ("school_id")  REFERENCES "tenants"("id")  ON DELETE CASCADE,
        CONSTRAINT "fk_attendance_student"   FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_attendance_teacher"   FOREIGN KEY ("teacher_id") REFERENCES "users"("id")    ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_attendance_student_date" ON "attendance" ("student_id", "date")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_attendance_school_date" ON "attendance" ("school_id", "date")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "attendance"`);
  }
}
