import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { Tenant } from "../tenants/tenant.entity.js";

/**
 * User — a person with access to a tenant. Roles: teacher | admin | finance.
 *
 * `passwordHash` lives here on the server entity but is **not** exposed via
 * the @sms/core-logic UserSchema — the schema is the cross-boundary shape.
 *
 * (schoolId, phone) is unique within a tenant. Phone numbers may legitimately
 * repeat across tenants (e.g. parents using their own phone for multiple
 * schools), so global uniqueness is wrong.
 */
@Entity({ name: "users" })
@Index("uq_users_school_phone", ["schoolId", "phone"], { unique: true })
@Index("idx_users_school", ["schoolId"])
export class User {
  @PrimaryColumn({ type: "uuid" })
  id!: string;

  @Column({ type: "uuid" })
  schoolId!: string;

  @ManyToOne(() => Tenant, { onDelete: "CASCADE" })
  @JoinColumn({ name: "school_id" })
  tenant?: Tenant;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "varchar", length: 20 })
  phone!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  email?: string | null;

  @Column({ type: "varchar", length: 50 })
  role!: "teacher" | "admin" | "finance";

  @Column({ type: "varchar", length: 255 })
  passwordHash!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  deviceId?: string | null;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @Column({ type: "timestamptz", default: () => "now()" })
  createdAt!: Date;
}
