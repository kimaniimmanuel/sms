import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { Tenant } from "../tenants/tenant.entity.js";
import { User } from "../users/user.entity.js";

/**
 * Payment — one row per M-Pesa initiation attempt.
 *
 * Lifecycle:
 *   1. POST /payments/initiate creates a row with status = 'pending'
 *   2. Daraja callback updates status to 'success' | 'failed' | 'cancelled'
 *
 * `mpesaReceipt` is the Daraja `MpesaReceiptNumber` and is the idempotency
 * key — UNIQUE so duplicate callbacks cannot issue duplicate access tokens.
 * NULL while pending (Postgres UNIQUE allows multiple NULLs).
 */
@Entity({ name: "payments" })
@Index("uq_payments_mpesa_receipt", ["mpesaReceipt"], {
  unique: true,
  where: '"mpesa_receipt" IS NOT NULL',
})
@Index("idx_payments_school_user", ["schoolId", "userId"])
export class Payment {
  @PrimaryColumn({ type: "uuid" })
  id!: string;

  @Column({ type: "uuid" })
  schoolId!: string;

  @ManyToOne(() => Tenant, { onDelete: "CASCADE" })
  @JoinColumn({ name: "school_id" })
  tenant?: Tenant;

  @Column({ type: "uuid" })
  userId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user?: User;

  @Column({ type: "integer" })
  amountKes!: number;

  @Column({ type: "varchar", length: 10 })
  pass!: "day" | "week" | "month";

  @Column({ type: "varchar", length: 255, nullable: true })
  mpesaReceipt?: string | null;

  @Column({ type: "varchar", length: 20 })
  status!: "pending" | "success" | "failed" | "cancelled";

  @Column({ type: "varchar", length: 255, nullable: true })
  failureReason?: string | null;

  @Column({ type: "timestamptz", default: () => "now()" })
  initiatedAt!: Date;

  @Column({ type: "timestamptz", nullable: true })
  completedAt?: Date | null;
}
