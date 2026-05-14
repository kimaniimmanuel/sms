import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * access_tokens — time-bound sync authorisation.
 * payments      — M-Pesa STK Push lifecycle (pending → success/failed/cancelled).
 *
 * Idempotency key: payments.mpesa_receipt is a partial UNIQUE index (only
 * enforced when not null), so multiple pending rows coexist while completed
 * rows guarantee Daraja callbacks can't double-issue tokens.
 */
export class AccessTokensAndPayments1778716800002 implements MigrationInterface {
  name = "AccessTokensAndPayments1778716800002";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "access_tokens" (
        "id"           uuid PRIMARY KEY,
        "user_id"      uuid         NOT NULL,
        "school_id"    uuid         NOT NULL,
        "role"         varchar(50)  NOT NULL,
        "valid_from"   timestamptz  NOT NULL,
        "valid_until"  timestamptz  NOT NULL,
        "payment_ref"  varchar(255) NOT NULL,
        "created_at"   timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT "chk_access_tokens_role"     CHECK ("role" IN ('teacher', 'admin', 'finance')),
        CONSTRAINT "chk_access_tokens_validity" CHECK ("valid_until" > "valid_from"),
        CONSTRAINT "fk_access_tokens_user"      FOREIGN KEY ("user_id")   REFERENCES "users"("id")   ON DELETE CASCADE,
        CONSTRAINT "fk_access_tokens_school"    FOREIGN KEY ("school_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_access_tokens_user_valid_until" ON "access_tokens" ("user_id", "valid_until" DESC)`,
    );

    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id"               uuid PRIMARY KEY,
        "school_id"        uuid         NOT NULL,
        "user_id"          uuid         NOT NULL,
        "amount_kes"       integer      NOT NULL,
        "pass"             varchar(10)  NOT NULL,
        "mpesa_receipt"    varchar(255),
        "status"           varchar(20)  NOT NULL DEFAULT 'pending',
        "failure_reason"   varchar(255),
        "initiated_at"     timestamptz  NOT NULL DEFAULT now(),
        "completed_at"     timestamptz,
        CONSTRAINT "chk_payments_amount" CHECK ("amount_kes" >= 0),
        CONSTRAINT "chk_payments_pass"   CHECK ("pass"   IN ('day', 'week', 'month')),
        CONSTRAINT "chk_payments_status" CHECK ("status" IN ('pending', 'success', 'failed', 'cancelled')),
        CONSTRAINT "fk_payments_school"  FOREIGN KEY ("school_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_payments_user"    FOREIGN KEY ("user_id")   REFERENCES "users"("id")   ON DELETE CASCADE
      )
    `);
    // Partial UNIQUE: enforce only when receipt is non-null so pending rows can coexist
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_payments_mpesa_receipt" ON "payments" ("mpesa_receipt") WHERE "mpesa_receipt" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_payments_school_user" ON "payments" ("school_id", "user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "payments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "access_tokens"`);
  }
}
