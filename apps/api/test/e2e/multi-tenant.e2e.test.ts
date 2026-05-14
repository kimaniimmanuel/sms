/**
 * Cross-tenant rejection — end-to-end (US-E5-004, UC-05).
 *
 * Boots the full NestJS app against the live Postgres at $DATABASE_URL,
 * seeds two tenants and one user (in Tenant A), and asserts the headline
 * multi-tenant guarantee: a JWT issued for Tenant A cannot read Tenant B
 * data, no matter what X-School-ID header is sent.
 *
 * Requires `docker compose up -d postgres` (or any reachable Postgres) and
 * the migrations from Epic E3 to have been applied. Run with:
 *
 *   pnpm --filter @sms/api test:e2e
 *
 * The test cleans up its seeded rows in afterAll so it doesn't pollute the
 * dev database; running it twice is idempotent.
 */
import "reflect-metadata";
import { type INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { DataSource } from "typeorm";
import bcrypt from "bcrypt";
import request from "supertest";

import { AppModule } from "../../src/app.module.js";

const TENANT_A = "01959be0-7d3a-7a4f-9b27-2d5a9f1c8e01";
const TENANT_B = "01959be0-7d3a-7a4f-9b27-2d5a9f1c8e02";
const USER_A_ID = "01959be0-7d3a-7a4f-9b27-2d5a9f1c8e03";
const UNKNOWN_TENANT = "01959be0-7d3a-7a4f-9b27-2d5a9f1c8e99";
const USER_A_PHONE = "+254700000001";
const USER_A_PASSWORD = "e2e-test-secret";

describe("Multi-tenant isolation (e2e)", () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessTokenA: string;

  async function cleanupTestRows() {
    await dataSource.query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [USER_A_ID]);
    await dataSource.query(`DELETE FROM users WHERE id = $1`, [USER_A_ID]);
    await dataSource.query(`DELETE FROM tenants WHERE id IN ($1, $2)`, [TENANT_A, TENANT_B]);
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    dataSource = app.get(DataSource);

    // Fresh slate
    await cleanupTestRows();

    // Seed two tenants
    await dataSource.query(
      `INSERT INTO tenants (id, school_name, tier, flat_fee_status) VALUES ($1, 'Tenant A School', 'sync-enabled', 'active'), ($2, 'Tenant B School', 'sync-enabled', 'inactive')`,
      [TENANT_A, TENANT_B],
    );

    // Seed a user in Tenant A with a bcrypt-hashed password
    const passwordHash = await bcrypt.hash(USER_A_PASSWORD, 12);
    await dataSource.query(
      `INSERT INTO users (id, school_id, name, phone, role, password_hash, is_active) VALUES ($1, $2, 'Test Teacher A', $3, 'teacher', $4, true)`,
      [USER_A_ID, TENANT_A, USER_A_PHONE, passwordHash],
    );

    // Login as Tenant A's user to obtain a JWT for the cross-tenant tests
    const loginRes = await request(app.getHttpServer())
      .post("/auth/login")
      .set("X-School-ID", TENANT_A)
      .send({ phone: USER_A_PHONE, password: USER_A_PASSWORD });
    expect(loginRes.status).toBe(200);
    accessTokenA = loginRes.body.accessToken;
  }, 60000);

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await cleanupTestRows();
    }
    await app?.close();
  });

  describe("TenantGuard (global)", () => {
    it("rejects GET /tenants/me with no X-School-ID → 400 MISSING_SCHOOL_ID", async () => {
      const res = await request(app.getHttpServer())
        .get("/tenants/me")
        .set("Authorization", `Bearer ${accessTokenA}`);
      expect(res.status).toBe(400);
      expect(res.body.code).toBe("MISSING_SCHOOL_ID");
    });

    it("rejects GET /tenants/me with malformed X-School-ID → 400 INVALID_SCHOOL_ID", async () => {
      const res = await request(app.getHttpServer())
        .get("/tenants/me")
        .set("X-School-ID", "not-a-uuid")
        .set("Authorization", `Bearer ${accessTokenA}`);
      expect(res.status).toBe(400);
      expect(res.body.code).toBe("INVALID_SCHOOL_ID");
    });

    it("rejects GET /tenants/me with an unknown tenant → 404 SCHOOL_NOT_FOUND", async () => {
      const res = await request(app.getHttpServer())
        .get("/tenants/me")
        .set("X-School-ID", UNKNOWN_TENANT)
        .set("Authorization", `Bearer ${accessTokenA}`);
      expect(res.status).toBe(404);
      expect(res.body.code).toBe("SCHOOL_NOT_FOUND");
    });
  });

  describe("JwtAuthGuard + cross-tenant defence", () => {
    it("rejects GET /tenants/me with no Bearer token → 401", async () => {
      const res = await request(app.getHttpServer())
        .get("/tenants/me")
        .set("X-School-ID", TENANT_A);
      expect(res.status).toBe(401);
    });

    it("ALLOWS GET /tenants/me when JWT and X-School-ID both point to Tenant A → 200", async () => {
      const res = await request(app.getHttpServer())
        .get("/tenants/me")
        .set("X-School-ID", TENANT_A)
        .set("Authorization", `Bearer ${accessTokenA}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(TENANT_A);
      expect(res.body.schoolName).toBe("Tenant A School");
    });

    it("REJECTS GET /tenants/me when JWT is for Tenant A but X-School-ID is Tenant B → 401 (headline guarantee)", async () => {
      const res = await request(app.getHttpServer())
        .get("/tenants/me")
        .set("X-School-ID", TENANT_B)
        .set("Authorization", `Bearer ${accessTokenA}`);
      // JwtStrategy.validate() asserts JWT.schoolId === X-School-ID
      expect(res.status).toBe(401);
    });
  });

  describe("@SkipTenant()", () => {
    it("/auth/refresh requires no X-School-ID (returns 401 from refresh logic, not from TenantGuard)", async () => {
      // Body validation will pass; the refresh token itself is fake so refresh
      // logic rejects with 401 INVALID_REFRESH_TOKEN. Crucially we did NOT
      // get a 400 MISSING_SCHOOL_ID — proving the @SkipTenant() decorator works.
      const res = await request(app.getHttpServer())
        .post("/auth/refresh")
        .send({ refreshToken: "fake-refresh-token-value" });
      expect(res.status).toBe(401);
      expect(res.body.code).toBe("INVALID_REFRESH_TOKEN");
    });
  });
});
