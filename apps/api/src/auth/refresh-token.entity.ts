import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { Tenant } from "../tenants/tenant.entity.js";
import { User } from "../users/user.entity.js";

/**
 * RefreshToken — persisted, server-revocable refresh tokens.
 *
 * The actual refresh token sent to the client is a random 256-bit secret;
 * only its SHA-256 hash is stored here. That way a DB leak cannot grant
 * sessions, and we can match by hash on each /auth/refresh call.
 *
 * Lifecycle:
 *   - issued on /auth/login (one row per login)
 *   - rotated on /auth/refresh (mark old revokedAt, insert new row)
 *   - revoked on /auth/logout
 *
 * A periodic cleanup task (post-prototype) can DELETE rows where
 * expires_at < now() - 30 days to keep the table small.
 */
@Entity({ name: "refresh_tokens" })
@Index("uq_refresh_tokens_hash", ["tokenHash"], { unique: true })
@Index("idx_refresh_tokens_user_active", ["userId", "revokedAt"])
export class RefreshToken {
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

  @Column({ type: "varchar", length: 64 })
  tokenHash!: string;

  @Column({ type: "timestamptz" })
  expiresAt!: Date;

  @Column({ type: "varchar", length: 255, nullable: true })
  deviceId?: string | null;

  @Column({ type: "timestamptz", nullable: true })
  revokedAt?: Date | null;

  @Column({ type: "timestamptz", default: () => "now()" })
  createdAt!: Date;
}
