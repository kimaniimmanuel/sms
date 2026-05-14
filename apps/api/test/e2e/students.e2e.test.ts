/**
 * Student CRUD — end-to-end (US-E7-001 through US-E7-004).
 *
 * Verifies:
 *   - admins can create / update / archive; teachers cannot
 *   - GET /students filters by grade, search (case-insensitive), includeArchived
 *   - pagination metadata is returned
 *   - cross-tenant lookups return 404 (defence in depth)
 *   - soft-delete: archived students are excluded by default, returned with ?includeArchived=true
 */
import "reflect-metadata";
import { type INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { DataSource } from "typeorm";
import bcrypt from "bcrypt";
import request from "supertest";

import { AppModule } from "../../src/app.module.js";

const TENANT_A = "01959be0-7d3a-7a4f-9b27-2d5a9f1d8001";
const TENANT_B = "01959be0-7d3a-7a4f-9b27-2d5a9f1d8002";
const ADMIN_A_ID = "01959be0-7d3a-7a4f-9b27-2d5a9f1d8003";
const TEACHER_A_ID = "01959be0-7d3a-7a4f-9b27-2d5a9f1d8004";
const ADMIN_A_PHONE = "+254700001000";
const TEACHER_A_PHONE = "+254700001001";
const PASSWORD = "students-e2e-pw";

// Pre-seeded students in Tenant A for filter/search tests
const STUDENT_IDS = {
  m1: "01959be0-7d3a-7a4f-9b27-2d5a9f1d8101",
  m2: "01959be0-7d3a-7a4f-9b27-2d5a9f1d8102",
  m3: "01959be0-7d3a-7a4f-9b27-2d5a9f1d8103",
  m4_g5: "01959be0-7d3a-7a4f-9b27-2d5a9f1d8104",
  archivedM5: "01959be0-7d3a-7a4f-9b27-2d5a9f1d8105",
};

describe("Students CRUD (e2e)", () => {
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
    await dataSource.query(
      `DELETE FROM students WHERE school_id IN ($1, $2)`,
      [TENANT_A, TENANT_B],
    );
    await dataSource.query(
      `DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE phone LIKE '+25470000100%')`,
    );
    await dataSource.query(
      `DELETE FROM users WHERE phone LIKE '+25470000100%'`,
    );
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
       VALUES ($1, 'Students Test A', 'sync-enabled', 'active'),
              ($2, 'Students Test B', 'sync-enabled', 'active')`,
      [TENANT_A, TENANT_B],
    );

    const adminHash = await bcrypt.hash(PASSWORD, 12);
    const teacherHash = await bcrypt.hash(PASSWORD, 12);

    await dataSource.query(
      `INSERT INTO users (id, school_id, name, phone, role, password_hash, is_active)
       VALUES ($1, $2, 'Admin A', $3, 'admin',  $4, true),
              ($5, $6, 'Teacher A', $7, 'teacher', $8, true)`,
      [
        ADMIN_A_ID, TENANT_A, ADMIN_A_PHONE, adminHash,
        TEACHER_A_ID, TENANT_A, TEACHER_A_PHONE, teacherHash,
      ],
    );

    // Seed 5 students in Tenant A
    await dataSource.query(
      `INSERT INTO students (id, school_id, name, grade, is_archived)
       VALUES ($1, $2, 'Mary Wanjiku', 'Grade 4', false),
              ($3, $2, 'Mariam Otieno', 'Grade 4', false),
              ($4, $2, 'Peter Kamau',   'Grade 4', false),
              ($5, $2, 'John Mwangi',   'Grade 5', false),
              ($6, $2, 'Old Student',   'Grade 4', true)`,
      [
        STUDENT_IDS.m1, TENANT_A,
        STUDENT_IDS.m2,
        STUDENT_IDS.m3,
        STUDENT_IDS.m4_g5,
        STUDENT_IDS.archivedM5,
      ],
    );

    adminToken = await login(TENANT_A, ADMIN_A_PHONE, PASSWORD);
    teacherToken = await login(TENANT_A, TEACHER_A_PHONE, PASSWORD);
  }, 60000);

  afterAll(async () => {
    if (dataSource?.isInitialized) await cleanupTestRows();
    await app?.close();
  });

  describe("GET /students (list with filters)", () => {
    it("returns all non-archived students by default", async () => {
      const res = await request(app.getHttpServer())
        .get("/students")
        .set("X-School-ID", TENANT_A)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(4); // 5 seeded - 1 archived
      expect(res.body.total).toBe(4);
      expect(res.body.page).toBe(1);
    });

    it("filters by exact grade", async () => {
      const res = await request(app.getHttpServer())
        .get("/students?grade=Grade%205")
        .set("X-School-ID", TENANT_A)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(1);
      expect(res.body.items[0].name).toBe("John Mwangi");
    });

    it("search is case-insensitive substring match on name", async () => {
      const res = await request(app.getHttpServer())
        .get("/students?search=MAR")
        .set("X-School-ID", TENANT_A)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      const names = res.body.items.map((s: { name: string }) => s.name);
      expect(names).toEqual(expect.arrayContaining(["Mary Wanjiku", "Mariam Otieno"]));
      expect(names).not.toContain("Peter Kamau");
    });

    it("includeArchived=true returns archived rows too", async () => {
      const res = await request(app.getHttpServer())
        .get("/students?includeArchived=true")
        .set("X-School-ID", TENANT_A)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(5);
      const archived = res.body.items.find((s: { isArchived: boolean }) => s.isArchived);
      expect(archived).toBeDefined();
    });

    it("pagination returns metadata", async () => {
      const res = await request(app.getHttpServer())
        .get("/students?page=1&pageSize=2")
        .set("X-School-ID", TENANT_A)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(2);
      expect(res.body.pageSize).toBe(2);
      expect(res.body.total).toBe(4);
    });

    it("teachers can list (read access is tenant-wide)", async () => {
      const res = await request(app.getHttpServer())
        .get("/students")
        .set("X-School-ID", TENANT_A)
        .set("Authorization", `Bearer ${teacherToken}`);
      expect(res.status).toBe(200);
    });
  });

  describe("POST /students (admin only)", () => {
    it("rejects teacher with 403 INSUFFICIENT_ROLE", async () => {
      const res = await request(app.getHttpServer())
        .post("/students")
        .set("X-School-ID", TENANT_A)
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({ name: "Should Fail", grade: "Grade 4" });
      expect(res.status).toBe(403);
      expect(res.body.code).toBe("INSUFFICIENT_ROLE");
    });

    it("admin creates student → 201 with auto-assigned schoolId", async () => {
      const res = await request(app.getHttpServer())
        .post("/students")
        .set("X-School-ID", TENANT_A)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Fresh Student",
          grade: "Grade 6",
          dateOfBirth: "2014-03-15",
          guardianPhone: "+254700009999",
        });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe("Fresh Student");
      expect(res.body.schoolId).toBe(TENANT_A);
      expect(res.body.isArchived).toBe(false);
      expect(res.body.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    });

    it("rejects invalid guardianPhone format → 400", async () => {
      const res = await request(app.getHttpServer())
        .post("/students")
        .set("X-School-ID", TENANT_A)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "X", grade: "Grade 4", guardianPhone: "0700123456" });
      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /students/:id (admin only)", () => {
    it("updates a single field, leaves others untouched", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/students/${STUDENT_IDS.m1}`)
        .set("X-School-ID", TENANT_A)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ grade: "Grade 5" });
      expect(res.status).toBe(200);
      expect(res.body.grade).toBe("Grade 5");
      expect(res.body.name).toBe("Mary Wanjiku");
    });

    it("404 when target id belongs to a different tenant", async () => {
      // Seed a student in Tenant B and try to patch with Tenant A's auth
      const OTHER_ID = "01959be0-7d3a-7a4f-9b27-2d5a9f1d8201";
      await dataSource.query(
        `INSERT INTO students (id, school_id, name, grade) VALUES ($1, $2, 'Other Tenant Student', 'Grade 4')`,
        [OTHER_ID, TENANT_B],
      );
      const res = await request(app.getHttpServer())
        .patch(`/students/${OTHER_ID}`)
        .set("X-School-ID", TENANT_A)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ grade: "Grade 5" });
      expect(res.status).toBe(404);
      expect(res.body.code).toBe("STUDENT_NOT_FOUND");
    });

    it("rejects teacher with 403", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/students/${STUDENT_IDS.m2}`)
        .set("X-School-ID", TENANT_A)
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({ grade: "Grade 5" });
      expect(res.status).toBe(403);
    });
  });

  describe("POST /students/:id/archive (admin only)", () => {
    it("admin archives a student → 200, isArchived=true", async () => {
      const res = await request(app.getHttpServer())
        .post(`/students/${STUDENT_IDS.m3}/archive`)
        .set("X-School-ID", TENANT_A)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.isArchived).toBe(true);
    });

    it("archived student is excluded from default list", async () => {
      const res = await request(app.getHttpServer())
        .get("/students")
        .set("X-School-ID", TENANT_A)
        .set("Authorization", `Bearer ${adminToken}`);
      const ids = res.body.items.map((s: { id: string }) => s.id);
      expect(ids).not.toContain(STUDENT_IDS.m3);
    });

    it("rejects teacher with 403", async () => {
      const res = await request(app.getHttpServer())
        .post(`/students/${STUDENT_IDS.m2}/archive`)
        .set("X-School-ID", TENANT_A)
        .set("Authorization", `Bearer ${teacherToken}`);
      expect(res.status).toBe(403);
    });
  });
});
