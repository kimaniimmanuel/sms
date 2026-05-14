import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { Tenant } from "../tenants/tenant.entity.js";
import { Student } from "../students/student.entity.js";
import { User } from "../users/user.entity.js";

/**
 * Attendance — one row per student per day.
 *
 * Idempotency is enforced by a composite unique index on (studentId, date) —
 * the bulk-submit endpoint (FR-ATT-001) calls upsert, not insert, so the
 * same client re-syncing identical rows is a no-op.
 *
 * `syncedAt` is populated by the API on insert/update to record when the
 * client's record was received; useful for ops debugging.
 */
@Entity({ name: "attendance" })
@Index("uq_attendance_student_date", ["studentId", "date"], { unique: true })
@Index("idx_attendance_school_date", ["schoolId", "date"])
export class Attendance {
  @PrimaryColumn({ type: "uuid" })
  id!: string;

  @Column({ type: "uuid" })
  schoolId!: string;

  @ManyToOne(() => Tenant, { onDelete: "CASCADE" })
  @JoinColumn({ name: "school_id" })
  tenant?: Tenant;

  @Column({ type: "uuid" })
  studentId!: string;

  @ManyToOne(() => Student, { onDelete: "CASCADE" })
  @JoinColumn({ name: "student_id" })
  student?: Student;

  @Column({ type: "uuid" })
  teacherId!: string;

  @ManyToOne(() => User, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "teacher_id" })
  teacher?: User;

  @Column({ type: "date" })
  date!: string;

  @Column({ type: "varchar", length: 20 })
  status!: "present" | "absent" | "late";

  @Column({ type: "text", nullable: true })
  note?: string | null;

  @Column({ type: "timestamptz", nullable: true })
  syncedAt?: Date | null;

  @Column({ type: "timestamptz", default: () => "now()" })
  createdAt!: Date;
}
