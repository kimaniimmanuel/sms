import { Column, Entity, PrimaryColumn } from "typeorm";

/**
 * Tenant — one row per school.
 *
 * Primary key is a client-generated UUID v7 (`newId()` in `@sms/core-logic`).
 * Never use `@PrimaryGeneratedColumn` — auto-increment IDs break offline sync.
 *
 * `flatFeeStatus = 'active'` exempts admin users on this tenant from the
 * per-sync 402 access check (see `AccessGuard` in Epic E10).
 */
@Entity({ name: "tenants" })
export class Tenant {
  @PrimaryColumn({ type: "uuid" })
  id!: string;

  @Column({ type: "varchar", length: 255 })
  schoolName!: string;

  @Column({ type: "varchar", length: 50, default: "offline" })
  tier!: "offline" | "sync-enabled";

  @Column({ type: "varchar", length: 255, nullable: true })
  contactName?: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  contactPhone?: string | null;

  @Column({ type: "varchar", length: 20, default: "inactive" })
  flatFeeStatus!: "inactive" | "active" | "suspended";

  @Column({ type: "timestamptz", default: () => "now()" })
  createdAt!: Date;
}
