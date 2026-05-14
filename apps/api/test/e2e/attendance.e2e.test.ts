/**
 * Attendance — end-to-end (US-E8-001 through US-E8-004).
 *
 * Verifies:
 *   - teachers and admins can submit; finance cannot (RolesGuard)
 *   - studentIds must belong to the same tenant
 *   - upsert is idempotent and updates same-day rows
 *   - past-date INSERT allowed (offline sync) — UPDATE blocked (ATT_EDIT_WINDOW_CLOSED)
 *   - future dates rejected
 *   - GET /attendance filters work
 *   - GET /attendance/summary returns by-grade counts
 *   - cross-tenant: smuggling another tenant's studentId is rejected
 */
import "reflect-metadata";
import { type INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { DataSource } from "typeorm";
import bcrypt from "bcrypt";
import request from "supertest";

import { AppModule } from "../../src/app.module.js";
import { KENYA_TZ, todayInTimeZone } from "../../src/common/date.js";

const TENANT_A = "01959be0-7d3a-7a4f-9b27-2d5a9f1e8001";
const TENANT_B = "01959be0-7d3a-7a4f-9b27-2d5a9f1e8002";
const ADMIN_A_ID = "01959be0-7d3a-7a4f-9b27-2d5a9f1e8003";
const TEACHER_A_ID = "01959be0-7d3a-7a4f-9b27-2d5a9f1e8004";
const FINANCE_A_ID = "01959be0-7d3a-7a4f-9b27-2d5a9f1e8005";
const ADMIN_A_PHONE = "+254700002000";
const TEACHER_A_PHONE = "+254700002001";
const FINANCE_A_PHONE = "+254700002002";
const PASSWORD = "attendance-e2e-pw";

const STUDENT_IDS = {
  s1_g4: "01959be0-7d3a-7a4f-9b27-2d5a9f1e8101",
  s2_g4: "01959be0-7d3a-7a4f-9b27-2d5a9f1e8102",
  s3_g4: "01959be0-7d3a-7a4f-9b27-2d5a9f1e8103",
  s4_g5: "01959be0-7d3a-7a4f-9b27-2d5a9f1e8104",
  // Student in tenant B — used to test cross-tenant rejection
  sB_g4: "01959be0-7d3a-7a4f-9b27-2d5a9f1e8201",
};

const TODAY = todayInTimeZone(KENYA_TZ);
const YESTERDAY = ((): string => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return todayInTimeZone(KENYA_TZ, d);
})();
const TOMORROW = ((): string => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return todayInTimeZone(KENYA_TZ, d);
})();

describe("Attendance (e2e)", () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let teacherToken: string;
  let financeToken: string;

  async function login(schoolId: string, phone: string, password: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post("/auth/login")
      .set("X-School-ID", schoolId)
      .send({ phone, password });
    expect(res.status).toBe(200);
    return res.body.accessToken;
  }

  async function cleanupTestRows() {
    await dataSource.query(`DELETE FROM attendance WHERE school_id IN ($1, $2)`, [
      TENANT_A,
      TENANT_B,
    ]);
    await dataSource.query(`DELETE FROM students WHERE school_id IN ($1, $2)`, [
      TENANT_A,
      TENANT_B,
    ]);
    await dataSource.query(
      `DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE phone LIKE '+25470000200%')`,
    );
    await dataSource.query(`DELETE FROM users WHERE phone LIKE '+25470000200%'`);
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

    await cleanupTestRows();

    // Tenants
    await dataSource.query(
      `INSERT INTO tenants (id, school_name, tier, flat_fee_status)
       VALUES ($1, 'Attendance Test A', 'sync-enabled', 'active'),
              ($2, 'Attendance Test B', 'sync-enabled', 'active')`,
      [TENANT_A, TENANT_B],
    );

    const hash = await bcrypt.hash(PASSWORD, 12);
    await dataSource.query(
      `INSERT INTO users (id, school_id, name, phone, role, password_hash, is_active)
       VALUES ($1, $2, 'Admin A',   $3, 'admin',   $4, true),
              ($5, $2, 'Teacher A', $6, 'teacher', $4, true),
              ($7, $2, 'Finance A', $8, 'finance', $4, true)`,
      [
        ADMIN_A_ID,
        TENANT_A,
        ADMIN_A_PHONE,
        hash,
        TEACHER_A_ID,
        TEACHER_A_PHONE,
        FINANCE_A_ID,
        FINANCE_A_PHONE,
      ],
    );

    // Students: 3 in Grade 4 (Tenant A), 1 in Grade 5 (Tenant A), 1 in Tenant B
    await dataSource.query(
      `INSERT INTO students (id, school_id, name, grade)
       VALUES ($1, $2, 'Alice',  'Grade 4'),
              ($3, $2, 'Bob',    'Grade 4'),
              ($4, $2, 'Carlos', 'Grade 4'),
              ($5, $2, 'Diana',  'Grade 5'),
              ($6, $7, 'B-tenant kid', 'Grade 4')`,
      [
        STUDENT_IDS.s1_g4,
        TENANT_A,
        STUDENT_IDS.s2_g4,
        STUDENT_IDS.s3_g4,
        STUDENT_IDS.s4_g5,
        STUDENT_IDS.sB_g4,
        TENANT_B,
      ],
    );

    adminToken = await login(TENANT_A, ADMIN_A_PHONE, PASSWORD);
    teacherToken = await login(TENANT_A, TEACHER_A_PHONE, PASSWORD);
    financeToken = await login(TENANT_A, FINANCE_A_PHONE, PASSWORD);
  }, 60000);

  afterAll(async () => {
    if (dataSource?.isInitialized) await cleanupTestRows();
    await app?.close();
  });

  describe("POST /attendance — bulk submit", () => {
    it("teacher submits today's roll → 200 with count", async () => {
      const res = await request(app.getHttpServer())
        .post("/attendance")
        .set("X-School-ID", TENANT_A)
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          entries: [
            { studentId: STUDENT_IDS.s1_g4, date: TODAY, status: "present" },
            { studentId: STUDENT_IDS.s2_g4, date: TODAY, status: "absent" },
            { studentId: STUDENT_IDS.s3_g4, date: TODAY, status: "late", note: "delayed bus" },
            { studentId: STUDENT_IDS.s4_g5, date: TODAY, status: "present" },
          ],
        });
      expect(res.status).toBe(200);
      expect(res.body.count).toBe(4);
      expect(res.body.teacherId).toBe(TEACHER_A_ID);
    });

    it("re-submitting today is idempotent (upsert on student_id + date)", async () => {
      const res = await request(app.getHttpServer())
        .post("/attendance")
        .set("X-School-ID", TENANT_A)
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          entries: [
            { studentId: STUDENT_IDS.s1_g4, date: TODAY, status: "late" }, // was present
          ],
        });
      expect(res.status).toBe(200);

      // Verify exactly one row exists for this (student, date) and it's now 'late'
      const rows = await dataSource.query(
        `SELECT status FROM attendance WHERE student_id = $1 AND date = $2`,
        [STUDENT_IDS.s1_g4, TODAY],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].status).toBe("late");
    });

    it("finance role → 403 INSUFFICIENT_ROLE", async () => {
      const res = await request(app.getHttpServer())
        .post("/attendance")
        .set("X-School-ID", TENANT_A)
        .set("Authorization", `Bearer ${financeToken}`)
        .send({
          entries: [{ studentId: STUDENT_IDS.s1_g4, date: TODAY, status: "present" }],
        });
      expect(res.status).toBe(403);
      expect(res.body.code).toBe("INSUFFICIENT_ROLE");
    });

    it("future date → 400 ATT_FUTURE_DATE", async () => {
      const res = await request(app.getHttpServer())
        .post("/attendance")
        .set("X-School-ID", TENANT_A)
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          entries: [{ studentId: STUDENT_IDS.s1_g4, date: TOMORROW, status: "present" }],
        });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe("ATT_FUTURE_DATE");
    });

    it("past date INSERT (no existing row) → 200 (offline sync of yesterday)", async () => {
      const res = await request(app.getHttpServer())
        .post("/attendance")
        .set("X-School-ID", TENANT_A)
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          entries: [{ studentId: STUDENT_IDS.s2_g4, date: YESTERDAY, status: "present" }],
        });
      expect(res.status).toBe(200);
    });

    it("past date UPDATE (row exists) → 403 ATT_EDIT_WINDOW_CLOSED", async () => {
      // The previous test inserted a row for s2_g4 / YESTERDAY. Now try to overwrite.
      const res = await request(app.getHttpServer())
        .post("/attendance")
        .set("X-School-ID", TENANT_A)
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          entries: [{ studentId: STUDENT_IDS.s2_g4, date: YESTERDAY, status: "absent" }],
        });
      expect(res.status).toBe(403);
      expect(res.body.code).toBe("ATT_EDIT_WINDOW_CLOSED");
    });

    it("studentId from another tenant → 400 INVALID_STUDENT_IDS", async () => {
      const res = await request(app.getHttpServer())
        .post("/attendance")
        .set("X-School-ID", TENANT_A)
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          entries: [{ studentId: STUDENT_IDS.sB_g4, date: TODAY, status: "present" }],
        });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe("INVALID_STUDENT_IDS");
    });

    it("malformed body — bad status → 400 from ValidationPipe", async () => {
      const res = await request(app.getHttpServer())
        .post("/attendance")
        .set("X-School-ID", TENANT_A)
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          entries: [{ studentId: STUDENT_IDS.s1_g4, date: TODAY, status: "skipped" }],
        });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /attendance", () => {
    it("filters by date — returns today's records", async () => {
      const res = await request(app.getHttpServer())
        .get(`/attendance?date=${TODAY}`)
        .set("X-School-ID", TENANT_A)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThanOrEqual(4);
      for (const row of res.body.items) {
        expect(row.date).toBe(TODAY);
        expect(row.schoolId).toBe(TENANT_A);
      }
    });

    it("filters by studentId", async () => {
      const res = await request(app.getHttpServer())
        .get(`/attendance?studentId=${STUDENT_IDS.s1_g4}`)
        .set("X-School-ID", TENANT_A)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      for (const row of res.body.items) {
        expect(row.studentId).toBe(STUDENT_IDS.s1_g4);
      }
    });

    it("filters by status", async () => {
      const res = await request(app.getHttpServer())
        .get(`/attendance?status=absent`)
        .set("X-School-ID", TENANT_A)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      for (const row of res.body.items) {
        expect(row.status).toBe("absent");
      }
    });
  });

  describe("GET /attendance/summary", () => {
    it("returns by-grade counts for today (default)", async () => {
      const res = await request(app.getHttpServer())
        .get("/attendance/summary")
        .set("X-School-ID", TENANT_A)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.date).toBe(TODAY);
      expect(Array.isArray(res.body.byGrade)).toBe(true);

      const g4 = res.body.byGrade.find((g: { grade: string }) => g.grade === "Grade 4");
      expect(g4).toBeDefined();
      expect(g4.total).toBeGreaterThanOrEqual(3);
      // Earlier test changed s1_g4 from present → late
      expect(g4.late).toBeGreaterThanOrEqual(2);

      expect(res.body.totals.total).toBeGreaterThanOrEqual(4);
    });

    it("respects ?date param", async () => {
      const res = await request(app.getHttpServer())
        .get(`/attendance/summary?date=${YESTERDAY}`)
        .set("X-School-ID", TENANT_A)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.date).toBe(YESTERDAY);
    });
  });
});
