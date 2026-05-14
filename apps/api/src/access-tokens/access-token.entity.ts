import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { Tenant } from "../tenants/tenant.entity.js";
import { User } from "../users/user.entity.js";

/**
 * AccessToken — time-bound sync authorisation. One row per purchased pass
 * (M-Pesa STK Push success) or admin-issued comp.
 *
 * Validity check is `isAccessValid(token)` in @sms/core-logic — strict
 * inequality on `validUntil > now`.
 *
 * Index on (userId, validUntil DESC) supports the AccessGuard's lookup of
 * the user's most-recent token.
 */
@Entity({ name: "access_tokens" })
@Index("idx_access_tokens_user_valid_until", ["userId", "validUntil"])
export class AccessToken {
  @PrimaryColumn({ type: "uuid" })
  id!: string;

  @Column({ type: "uuid" })
  userId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user?: User;

  @Column({ type: "uuid" })
  schoolId!: string;

  @ManyToOne(() => Tenant, { onDelete: "CASCADE" })
  @JoinColumn({ name: "school_id" })
  tenant?: Tenant;

  @Column({ type: "varchar", length: 50 })
  role!: "teacher" | "admin" | "finance";

  @Column({ type: "timestamptz" })
  validFrom!: Date;

  @Column({ type: "timestamptz" })
  validUntil!: Date;

  @Column({ type: "varchar", length: 255 })
  paymentRef!: string;

  @Column({ type: "timestamptz", default: () => "now()" })
  createdAt!: Date;
}
