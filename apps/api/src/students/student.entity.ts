import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { Tenant } from "../tenants/tenant.entity.js";

/**
 * Student — one row per pupil. `isArchived` is the soft-delete flag —
 * students are never hard-deleted to preserve attendance and grading history.
 */
@Entity({ name: "students" })
@Index("idx_students_school", ["schoolId"])
@Index("idx_students_school_grade", ["schoolId", "grade"])
export class Student {
  @PrimaryColumn({ type: "uuid" })
  id!: string;

  @Column({ type: "uuid" })
  schoolId!: string;

  @ManyToOne(() => Tenant, { onDelete: "CASCADE" })
  @JoinColumn({ name: "school_id" })
  tenant?: Tenant;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "varchar", length: 50 })
  grade!: string;

  @Column({ type: "date", nullable: true })
  dateOfBirth?: Date | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  guardianPhone?: string | null;

  @Column({ type: "boolean", default: false })
  isArchived!: boolean;

  @Column({ type: "timestamptz", default: () => "now()" })
  createdAt!: Date;
}
