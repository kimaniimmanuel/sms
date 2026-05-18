/**
 * Sync gating — end-to-end (US-E10-002, US-E10-003, US-E11-003).
 *
 * The headline prototype flow:
 *   teacher tries to sync → 402 ACCESS_EXPIRED
 *     → teacher pays via M-Pesa (mocked) → token issued
 *       → teacher tries again → 200 with attendance saved
 *
 * Plus the admin flat-fee bypass: an admin on `flatFeeStatus = 'active'`
 * skips the 402 gate entirely.
 */
import "reflect-metadata";
import { type INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { DataSource } from "typeorm";
import bcrypt from "bcrypt";
import request from "supertest";

import { AppModule } from "../../src/app.module.js";
import { DarajaService } from "../../src/payments/daraja.service.js";
import { PaymentsGateway } from "../../src/payments/payments.gateway.js";
import { KENYA_TZ, todayInTimeZone } from "../../src/common/date.js";

const TENANT_FLAT = "01959be0-7d3a-7a4f-9b27-2d5a9f1f9b01"; // flatFeeStatus=active
const TENANT_PAID = "01959be0-7d3a-7a4f-9b27-2d5a9f1f9b02"; // flatFeeStatus=inactive
const ADMIN_FLAT_ID = "01959be0-7d3a-7a4f-9b27-2d5a9f1f9b03";
const TEACHER_FLAT_ID = "01959be0-7d3a-7a4f-9b27-2d5a9f1f9b04";
const TEACHER_PAID_ID = "01959be0-7d3a-7a4f-9b27-2d5a9f1f9b05";
const STUDENT_FLAT_ID = "01959be0-7d3a-7a4f-9b27-2d5a9f1f9b06";
const STUDENT_PAID_ID = "01959be0-7d3a-7a4f-9b27-2d5a9f1f9b07";
const ADMIN_PHONE = "+254700004000";
const TEACHER_FLAT_PHONE = "+254700004001";
const TEACHER_PAID_PHONE = "+254700004002";
const PASSWORD = "sync-e2e-pw";

const TODAY = todayInTimeZone(KENYA_TZ);

describe("Sync gating (e2e)", () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let fakeDaraja: { stkPush: jest.Mock };
  let fakeGateway: { emitAccessGranted: jest.Mock };

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
      TENANT_FLAT,
      TENANT_PAID,
    ]);
    await dataSource.query(`DELETE FROM access_tokens WHERE school_id IN ($1, $2)`, [
      TENANT_FLAT,
      TENANT_PAID,
    ]);
    await dataSource.query(`DELETE FROM payments WHERE school_id IN ($1, $2)`, [
      TENANT_FLAT,
      TENANT_PAID,
    ]);
    await dataSource.query(`DELETE FROM students WHERE school_id IN ($1, $2)`, [
      TENANT_FLAT,
      TENANT_PAID,
    ]);
    await dataSource.query(
      `DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE phone LIKE '+25470000400%')`,
    );
    await dataSource.query(`DELETE FROM users WHERE phone LIKE '+25470000400%'`);
    await dataSource.query(`DELETE FROM tenants WHERE id IN ($1, $2)`, [TENANT_FLAT, TENANT_PAID]);
  }

  beforeAll(async () => {
    fakeDaraja = {
      stkPush: jest.fn().mockResolvedValue({
        MerchantRequestID: "M-SYNC",
        CheckoutRequestID: "CHECKOUT-SYNC-001",
        ResponseCode: "0",
        ResponseDescription: "ok",
        CustomerMessage: "ok",
      }),
    };
    fakeGateway = { emitAccessGranted: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DarajaService)
      .useValue(fakeDaraja)
      .overrideProvider(PaymentsGateway)
      .useValue(fakeGateway)
      .compile();

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

    // Two tenants — same setup except flatFeeStatus
    await dataSource.query(
      `INSERT INTO tenants (id, school_name, tier, flat_fee_status)
       VALUES ($1, 'Flat-fee School', 'sync-enabled', 'active'),
              ($2, 'Pay-per-use School', 'sync-enabled', 'inactive')`,
      [TENANT_FLAT, TENANT_PAID],
    );

    const hash = await bcrypt.hash(PASSWORD, 12);
    await dataSource.query(
      `INSERT INTO users (id, school_id, name, phone, role, password_hash, is_active)
       VALUES ($1, $2, 'Admin Flat',    $3, 'admin',   $4, true),
              ($5, $2, 'Teacher Flat',  $6, 'teacher', $4, true),
              ($7, $8, 'Teacher Paid',  $9, 'teacher', $4, true)`,
      [
        ADMIN_FLAT_ID,
        TENANT_FLAT,
        ADMIN_PHONE,
        hash,
        TEACHER_FLAT_ID,
        TEACHER_FLAT_PHONE,
        TEACHER_PAID_ID,
        TENANT_PAID,
        TEACHER_PAID_PHONE,
      ],
    );

    await dataSource.query(
      `INSERT INTO students (id, school_id, name, grade)
       VALUES ($1, $2, 'Flat Student', 'Grade 4'),
              ($3, $4, 'Paid Student', 'Grade 4')`,
      [STUDENT_FLAT_ID, TENANT_FLAT, STUDENT_PAID_ID, TENANT_PAID],
    );
  }, 60000);

  afterAll(async () => {
    if (dataSource?.isInitialized) await cleanupTestRows();
    await app?.close();
  });

  describe("AccessGuard — flat-fee bypass", () => {
    it("admin on active-flat-fee tenant: POST /sync/push → 200 (no token needed)", async () => {
      const token = await login(TENANT_FLAT, ADMIN_PHONE, PASSWORD);
      const res = await request(app.getHttpServer())
        .post("/sync/push")
        .set("X-School-ID", TENANT_FLAT)
        .set("Authorization", `Bearer ${token}`)
        .send({
          attendance: [{ studentId: STUDENT_FLAT_ID, date: TODAY, status: "present" }],
        });
      expect(res.status).toBe(200);
      expect(res.body.attendance.count).toBe(1);
    });

    it("teacher on active-flat-fee tenant still needs a token (no bypass for teachers)", async () => {
      const token = await login(TENANT_FLAT, TEACHER_FLAT_PHONE, PASSWORD);
      const res = await request(app.getHttpServer())
        .post("/sync/push")
        .set("X-School-ID", TENANT_FLAT)
        .set("Authorization", `Bearer ${token}`)
        .send({
          attendance: [{ studentId: STUDENT_FLAT_ID, date: TODAY, status: "present" }],
        });
      expect(res.status).toBe(402);
      expect(res.body.code).toBe("ACCESS_EXPIRED");
      expect(res.body.upgradeUrl).toBe("/pay");
    });
  });

  describe("AccessGuard — per-user token gate", () => {
    it("teacher with NO token: POST /sync/push → 402 ACCESS_EXPIRED", async () => {
      const token = await login(TENANT_PAID, TEACHER_PAID_PHONE, PASSWORD);
      const res = await request(app.getHttpServer())
        .post("/sync/push")
        .set("X-School-ID", TENANT_PAID)
        .set("Authorization", `Bearer ${token}`)
        .send({
          attendance: [{ studentId: STUDENT_PAID_ID, date: TODAY, status: "present" }],
        });
      expect(res.status).toBe(402);
      expect(res.body.code).toBe("ACCESS_EXPIRED");
      expect(res.body.upgradeUrl).toBe("/pay");
    });

    it("teacher with EXPIRED token → 402", async () => {
      // Insert an expired token directly
      await dataSource.query(
        `INSERT INTO access_tokens (id, user_id, school_id, role, valid_from, valid_until, payment_ref)
         VALUES ($1, $2, $3, 'teacher', $4, $5, 'EXPIRED-TEST')`,
        [
          "01959be0-7d3a-7a4f-9b27-2d5a9f1f9c01",
          TEACHER_PAID_ID,
          TENANT_PAID,
          new Date(Date.now() - 2 * 3600 * 1000),
          new Date(Date.now() - 3600 * 1000), // expired 1h ago
        ],
      );
      const token = await login(TENANT_PAID, TEACHER_PAID_PHONE, PASSWORD);
      const res = await request(app.getHttpServer())
        .post("/sync/push")
        .set("X-School-ID", TENANT_PAID)
        .set("Authorization", `Bearer ${token}`)
        .send({
          attendance: [{ studentId: STUDENT_PAID_ID, date: TODAY, status: "present" }],
        });
      expect(res.status).toBe(402);
    });
  });

  describe("End-to-end: pay → token issued → sync works", () => {
    it("the full demo flow", async () => {
      const token = await login(TENANT_PAID, TEACHER_PAID_PHONE, PASSWORD);

      // 1. Initial sync attempt → 402
      const blocked = await request(app.getHttpServer())
        .post("/sync/push")
        .set("X-School-ID", TENANT_PAID)
        .set("Authorization", `Bearer ${token}`)
        .send({
          attendance: [{ studentId: STUDENT_PAID_ID, date: TODAY, status: "late" }],
        });
      expect(blocked.status).toBe(402);

      // 2. Initiate M-Pesa payment (Daraja is mocked)
      fakeDaraja.stkPush.mockResolvedValueOnce({
        MerchantRequestID: "M-PAY-FLOW",
        CheckoutRequestID: "CHECKOUT-PAY-FLOW",
        ResponseCode: "0",
        ResponseDescription: "ok",
        CustomerMessage: "ok",
      });
      const initRes = await request(app.getHttpServer())
        .post("/payments/initiate")
        .set("X-School-ID", TENANT_PAID)
        .set("Authorization", `Bearer ${token}`)
        .send({ pass: "day" });
      expect(initRes.status).toBe(202);
      expect(initRes.body.checkoutRequestId).toBe("CHECKOUT-PAY-FLOW");

      // 3. Daraja confirms success → access token issued
      const cbRes = await request(app.getHttpServer())
        .post("/payments/callback")
        .send({
          Body: {
            stkCallback: {
              MerchantRequestID: "M-PAY-FLOW",
              CheckoutRequestID: "CHECKOUT-PAY-FLOW",
              ResultCode: 0,
              ResultDesc: "ok",
              CallbackMetadata: {
                Item: [
                  { Name: "Amount", Value: 10 },
                  { Name: "MpesaReceiptNumber", Value: "MPE-SYNC-FLOW" },
                  { Name: "TransactionDate", Value: 20260515110000 },
                  { Name: "PhoneNumber", Value: 254700004002 },
                ],
              },
            },
          },
        });
      expect(cbRes.status).toBe(200);

      // 4. Retry sync — now unblocked
      const unblocked = await request(app.getHttpServer())
        .post("/sync/push")
        .set("X-School-ID", TENANT_PAID)
        .set("Authorization", `Bearer ${token}`)
        .send({
          attendance: [{ studentId: STUDENT_PAID_ID, date: TODAY, status: "late" }],
        });
      expect(unblocked.status).toBe(200);
      expect(unblocked.body.attendance.count).toBe(1);

      // 5. The actual attendance row landed in the DB
      const rows = await dataSource.query(
        `SELECT status FROM attendance WHERE student_id = $1 AND date = $2`,
        [STUDENT_PAID_ID, TODAY],
      );
      expect(rows[0].status).toBe("late");
    });
  });

  describe("PushSyncDto validation", () => {
    it("empty body is OK (no-op sync)", async () => {
      const token = await login(TENANT_FLAT, ADMIN_PHONE, PASSWORD);
      const res = await request(app.getHttpServer())
        .post("/sync/push")
        .set("X-School-ID", TENANT_FLAT)
        .set("Authorization", `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(200);
      expect(res.body.attendance).toBeNull();
    });

    it("rejects malformed attendance entry → 400", async () => {
      const token = await login(TENANT_FLAT, ADMIN_PHONE, PASSWORD);
      const res = await request(app.getHttpServer())
        .post("/sync/push")
        .set("X-School-ID", TENANT_FLAT)
        .set("Authorization", `Bearer ${token}`)
        .send({
          attendance: [{ studentId: STUDENT_FLAT_ID, date: TODAY, status: "vibing" }],
        });
      expect(res.status).toBe(400);
    });
  });
});
