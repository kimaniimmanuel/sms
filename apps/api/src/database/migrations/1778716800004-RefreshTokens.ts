import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * refresh_tokens — server-revocable refresh tokens.
 *
 * tokenHash stores the SHA-256 of the actual token (64 hex chars).
 * Unique by hash so /auth/refresh lookup is a single index hit.
 * Indexed by (user_id, revoked_at) so "list active sessions for user" is cheap.
 */
export class RefreshTokens1778716800004 implements MigrationInterface {
  name = "RefreshTokens1778716800004";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id"          uuid PRIMARY KEY,
        "user_id"     uuid         NOT NULL,
        "school_id"   uuid         NOT NULL,
        "token_hash"  varchar(64)  NOT NULL,
        "expires_at"  timestamptz  NOT NULL,
        "device_id"   varchar(255),
        "revoked_at"  timestamptz,
        "created_at"  timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT "fk_refresh_tokens_user"   FOREIGN KEY ("user_id")   REFERENCES "users"("id")   ON DELETE CASCADE,
        CONSTRAINT "fk_refresh_tokens_school" FOREIGN KEY ("school_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_refresh_tokens_hash" ON "refresh_tokens" ("token_hash")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_refresh_tokens_user_active" ON "refresh_tokens" ("user_id", "revoked_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens"`);
  }
}
