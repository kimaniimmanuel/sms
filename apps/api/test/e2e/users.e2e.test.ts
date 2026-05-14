/**
 * Users CRUD + role gating — end-to-end (US-E6-002, US-E6-003).
 *
 * Verifies:
 *   - admins can create users; teachers cannot (RolesGuard)
 *   - GET /users returns the tenant's users, never another tenant's
 *   - duplicate phone within a tenant → 409
 *   - same phone in a different tenant succeeds (composite uniqueness)
 *   - passwordHash is never on the response
 *
 * Requires Postgres running and migrations applied. Run with:
 *   pnpm --filter @sms/api test:e2e
 */
import "reflect-metadata";
import { type INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { DataSource } from "typeorm";
import bcrypt from "bcrypt";
import request from "supertest";

import { AppModule } from "../../src/app.module.js";

const TENANT_A = "01959be0-7d3a-7a4f-9b27-2d5a9f1c8f01";
const TENANT_B = "01959be0-7d3a-7a4f-9b27-2d5a9f1c8f02";
const ADMIN_A_ID = "01959be0-7d3a-7a4f-9b27-2d5a9f1c8f03";
const TEACHER_A_ID = "01959be0-7d3a-7a4f-9b27-2d5a9f1c8f04";
const ADMIN_A_PHONE = "+254700000010";
const TEACHER_A_PHONE = "+254700000011";
const ADMIN_A_PASSWORD = "e2e-admin-pw";
const TEACHER_A_PASSWORD = "e2e-teacher-pw";

describe("Users CRUD (e2e)", () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let teacherToken: string;

  async function login(
    schoolId: string,
    phone: string,
    password: string,
  ): Promise<string> {
    const res = await request(app.getHttpServer())
      .post("/auth/login")
      .set("X-School-ID", schoolId)
      .send({ phone, password });
    expect(res.status).toBe(200);
    return res.body.accessToken;
  }

  async function cleanupTestRows() {
    // Delete by phone-prefix so any test-created users in the same tenants
    // also get cleaned up.
    await dataSource.query(
      `DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE phone LIKE '+25470000001%')`,
    );
    await dataSource.query(`DELETE FROM users WHERE phone LIKE '+25470000001%'`);
    await dataSource.query(`DELETE FROM users WHERE phone LIKE '+25470000002%'`);
    await dataSource.query(`DELETE FROM tenants WHERE id IN ($1, $2)`, [
      TENANT_A,
      TENANT_B,
    ]);
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

    await cleanupTestRows();

    // Tenants
    await dataSource.query(
      `INSERT INTO tenants (id, school_name, tier, flat_fee_status)
       VALUES ($1, 'A School', 'sync-enabled', 'active'),
              ($2, 'B School', 'sync-enabled', 'active')`,
      [TENANT_A, TENANT_B],
    );
    // Admin in Tenant A
    await dataSource.query(
      `INSERT INTO users (id, school_id, name, phone, role, password_hash, is_active)
       VALUES ($1, $2, 'Admin A', $3, 'admin', $4, true)`,
      [ADMIN_A_ID, TENANT_A, ADMIN_A_PHONE, await bcrypt.hash(ADMIN_A_PASSWORD, 12)],
    );
    // Teacher in Tenant A
    await dataSource.query(
      `INSERT INTO users (id, school_id, name, phone, role, password_hash, is_active)
       VALUES ($1, $2, 'Teacher A', $3, 'teacher', $4, true)`,
      [TEACHER_A_ID, TENANT_A, TEACHER_A_PHONE, await bcrypt.hash(TEACHER_A_PASSWORD, 12)],
    );

    adminToken = await login(TENANT_A, ADMIN_A_PHONE, ADMIN_A_PASSWORD);
    teacherToken = await login(TENANT_A, TEACHER_A_PHONE, TEACHER_A_PASSWORD);
  }, 60000);

  afterAll(async () => {
    if (dataSource?.isInitialized) await cleanupTestRows();
    await app?.close();
  });

  describe("POST /users (RolesGuard: admin only)", () => {
    it("rejects a teacher with 403 INSUFFICIENT_ROLE", async () => {
      const res = await request(app.getHttpServer())
        .post("/users")
        .set("X-School-ID", TENANT_A)
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          name: "New Finance",
          phone: "+254700000020",
          role: "finance",
          password: "supersecret",
        });
      expect(res.status).toBe(403);
      expect(res.body.code).toBe("INSUFFICIENT_ROLE");
    });

    it("admin creates a teacher → 201 with no passwordHash in response", async () => {
      const res = await request(app.getHttpServer())
        .post("/users")
        .set("X-School-ID", TENANT_A)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Brand-new Teacher",
          phone: "+254700000020",
          role: "teacher",
          password: "supersecret-pw",
        });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe("Brand-new Teacher");
      expect(res.body.role).toBe("teacher");
      expect(res.body.schoolId).toBe(TENANT_A);
      expect(res.body).not.toHaveProperty("passwordHash");
    });

    it("duplicate phone in the same tenant → 409 USER_PHONE_TAKEN", async () => {
      const res = await request(app.getHttpServer())
        .post("/users")
        .set("X-School-ID", TENANT_A)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Duplicate Phone",
          phone: ADMIN_A_PHONE, // already taken by admin A
          role: "teacher",
          password: "supersecret-pw",
        });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe("USER_PHONE_TAKEN");
    });

    it("rejects invalid role → 400", async () => {
      const res = await request(app.getHttpServer())
        .post("/users")
        .set("X-School-ID", TENANT_A)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Bad Role",
          phone: "+254700000021",
          role: "principal",
          password: "supersecret-pw",
        });
      expect(res.status).toBe(400);
    });

    it("rejects short password → 400", async () => {
      const res = await request(app.getHttpServer())
        .post("/users")
        .set("X-School-ID", TENANT_A)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Weak Pw",
          phone: "+254700000022",
          role: "teacher",
          password: "short",
        });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /users", () => {
    it("returns users for the current tenant, omitting passwordHash", async () => {
      const res = await request(app.getHttpServer())
        .get("/users")
        .set("X-School-ID", TENANT_A)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2); // admin + teacher (+ any from earlier tests)
      for (const u of res.body) {
        expect(u.schoolId).toBe(TENANT_A);
        expect(u).not.toHaveProperty("passwordHash");
      }
    });

    it("a teacher CAN list users (read access is tenant-wide)", async () => {
      const res = await request(app.getHttpServer())
        .get("/users")
        .set("X-School-ID", TENANT_A)
        .set("Authorization", `Bearer ${teacherToken}`);
      expect(res.status).toBe(200);
    });
  });

  describe("Cross-tenant isolation on users", () => {
    it("admin in Tenant A cannot list Tenant B's users (JwtStrategy rejects mismatch → 401)", async () => {
      const res = await request(app.getHttpServer())
        .get("/users")
        .set("X-School-ID", TENANT_B) // header points to a tenant the JWT doesn't belong to
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(401);
    });

    it("same phone reused in a different tenant succeeds (composite unique on (school_id, phone))", async () => {
      // Seed an admin in Tenant B to call its create endpoint
      const ADMIN_B_ID = "01959be0-7d3a-7a4f-9b27-2d5a9f1c8f10";
      const ADMIN_B_PHONE = "+254700000019";
      const ADMIN_B_PASSWORD = "e2e-admin-b-pw";
      await dataSource.query(
        `INSERT INTO users (id, school_id, name, phone, role, password_hash, is_active)
         VALUES ($1, $2, 'Admin B', $3, 'admin', $4, true)
         ON CONFLICT (id) DO NOTHING`,
        [ADMIN_B_ID, TENANT_B, ADMIN_B_PHONE, await bcrypt.hash(ADMIN_B_PASSWORD, 12)],
      );
      const tokenB = await login(TENANT_B, ADMIN_B_PHONE, ADMIN_B_PASSWORD);

      // Admin B creates a user with the SAME phone as Admin A — must succeed
      const res = await request(app.getHttpServer())
        .post("/users")
        .set("X-School-ID", TENANT_B)
        .set("Authorization", `Bearer ${tokenB}`)
        .send({
          name: "Same Phone Diff Tenant",
          phone: ADMIN_A_PHONE, // intentionally collides with Tenant A
          role: "teacher",
          password: "supersecret-pw",
        });
      expect(res.status).toBe(201);
      expect(res.body.phone).toBe(ADMIN_A_PHONE);
      expect(res.body.schoolId).toBe(TENANT_B);
    });
  });
});
