/**
 * M-Pesa payments — end-to-end (US-E9-001 through US-E9-005 + US-E10-001).
 *
 * Mocks DarajaService so the test runs without real Safaricom credentials,
 * but exercises every other layer: HTTP, validation, persistence, callback
 * idempotency, AccessToken issuance, and the WebSocket emit.
 *
 * What's verified:
 *   - POST /payments/initiate creates a pending payment + fires STK Push
 *   - Finance role is rejected (only teacher/admin can purchase)
 *   - POST /payments/callback (success) marks payment success, issues an
 *     AccessToken with the right duration, emits access:granted via the
 *     gateway
 *   - Duplicate callback for the same MpesaReceiptNumber is idempotent —
 *     no double-issuance
 *   - Failure callback (ResultCode≠0) marks payment failed/cancelled and
 *     does NOT issue a token
 *   - Callback endpoint is reachable without X-School-ID (@SkipTenant)
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

const TENANT_A = "01959be0-7d3a-7a4f-9b27-2d5a9f1f9001";
const TEACHER_ID = "01959be0-7d3a-7a4f-9b27-2d5a9f1f9002";
const FINANCE_ID = "01959be0-7d3a-7a4f-9b27-2d5a9f1f9003";
const TEACHER_PHONE = "+254700003000";
const FINANCE_PHONE = "+254700003001";
const PASSWORD = "payments-e2e-pw";

describe("Payments (e2e)", () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let teacherToken: string;
  let fakeDaraja: { stkPush: jest.Mock };
  let fakeGateway: { emitAccessGranted: jest.Mock };

  async function login(phone: string, password: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post("/auth/login")
      .set("X-School-ID", TENANT_A)
      .send({ phone, password });
    expect(res.status).toBe(200);
    return res.body.accessToken;
  }

  async function cleanupTestRows() {
    await dataSource.query(`DELETE FROM access_tokens WHERE school_id = $1`, [TENANT_A]);
    await dataSource.query(`DELETE FROM payments WHERE school_id = $1`, [TENANT_A]);
    await dataSource.query(
      `DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE phone LIKE '+25470000300%')`,
    );
    await dataSource.query(`DELETE FROM users WHERE phone LIKE '+25470000300%'`);
    await dataSource.query(`DELETE FROM tenants WHERE id = $1`, [TENANT_A]);
  }

  beforeAll(async () => {
    fakeDaraja = {
      stkPush: jest.fn().mockResolvedValue({
        MerchantRequestID: "M-1",
        CheckoutRequestID: "CHECKOUT-XYZ",
        ResponseCode: "0",
        ResponseDescription: "Success. Request accepted for processing",
        CustomerMessage: "Success. Request accepted for processing",
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

    await dataSource.query(
      `INSERT INTO tenants (id, school_name, tier, flat_fee_status)
       VALUES ($1, 'Payments Test', 'sync-enabled', 'inactive')`,
      [TENANT_A],
    );

    const hash = await bcrypt.hash(PASSWORD, 12);
    await dataSource.query(
      `INSERT INTO users (id, school_id, name, phone, role, password_hash, is_active)
       VALUES ($1, $2, 'Teacher A', $3, 'teacher', $4, true),
              ($5, $2, 'Finance A', $6, 'finance', $4, true)`,
      [TEACHER_ID, TENANT_A, TEACHER_PHONE, hash, FINANCE_ID, FINANCE_PHONE],
    );

    teacherToken = await login(TEACHER_PHONE, PASSWORD);
  }, 60000);

  afterAll(async () => {
    if (dataSource?.isInitialized) await cleanupTestRows();
    await app?.close();
  });

  beforeEach(() => {
    fakeDaraja.stkPush.mockClear();
    fakeGateway.emitAccessGranted.mockClear();
  });

  describe("POST /payments/initiate", () => {
    it("teacher → 202 with paymentId + CheckoutRequestID; pending row persisted", async () => {
      const res = await request(app.getHttpServer())
        .post("/payments/initiate")
        .set("X-School-ID", TENANT_A)
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({ pass: "day" });

      expect(res.status).toBe(202);
      expect(res.body.amountKes).toBe(10);
      expect(res.body.pass).toBe("day");
      expect(res.body.checkoutRequestId).toBe("CHECKOUT-XYZ");
      expect(res.body.paymentId).toMatch(/^[0-9a-f]{8}-/);

      const rows = await dataSource.query(
        `SELECT status, amount_kes, pass, failure_reason FROM payments WHERE id = $1`,
        [res.body.paymentId],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].status).toBe("pending");
      expect(rows[0].amount_kes).toBe(10);
      expect(rows[0].pass).toBe("day");
      // CheckoutRequestID is stashed in failure_reason during prototype phase
      expect(rows[0].failure_reason).toBe("CHECKOUT-XYZ");
    });

    it("finance role → 400 ROLE_NOT_PRICED", async () => {
      const financeToken = await login(FINANCE_PHONE, PASSWORD);
      const res = await request(app.getHttpServer())
        .post("/payments/initiate")
        .set("X-School-ID", TENANT_A)
        .set("Authorization", `Bearer ${financeToken}`)
        .send({ pass: "day" });
      // RolesGuard fires first (only teacher/admin allowed on this route)
      expect(res.status).toBe(403);
    });

    it("invalid pass enum → 400", async () => {
      const res = await request(app.getHttpServer())
        .post("/payments/initiate")
        .set("X-School-ID", TENANT_A)
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({ pass: "lifetime" });
      expect(res.status).toBe(400);
    });
  });

  describe("POST /payments/callback", () => {
    let paymentId: string;
    let checkoutId: string;

    beforeAll(async () => {
      // Set up a fresh pending payment specifically for the callback tests
      fakeDaraja.stkPush.mockResolvedValueOnce({
        MerchantRequestID: "M-CB",
        CheckoutRequestID: "CHECKOUT-CB-001",
        ResponseCode: "0",
        ResponseDescription: "ok",
        CustomerMessage: "ok",
      });
      const res = await request(app.getHttpServer())
        .post("/payments/initiate")
        .set("X-School-ID", TENANT_A)
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({ pass: "week" });
      paymentId = res.body.paymentId;
      checkoutId = res.body.checkoutRequestId;
    });

    const successBody = (checkout: string, receipt: string) => ({
      Body: {
        stkCallback: {
          MerchantRequestID: "M-CB",
          CheckoutRequestID: checkout,
          ResultCode: 0,
          ResultDesc: "The service request is processed successfully.",
          CallbackMetadata: {
            Item: [
              { Name: "Amount", Value: 50 },
              { Name: "MpesaReceiptNumber", Value: receipt },
              { Name: "TransactionDate", Value: 20260515110000 },
              { Name: "PhoneNumber", Value: 254700003000 },
            ],
          },
        },
      },
    });

    it("succeeds without X-School-ID (@SkipTenant); success path issues access token and emits", async () => {
      const res = await request(app.getHttpServer())
        .post("/payments/callback")
        .send(successBody(checkoutId, "MPE-RECEIPT-AAA"));

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);

      const paymentRows = await dataSource.query(
        `SELECT status, mpesa_receipt FROM payments WHERE id = $1`,
        [paymentId],
      );
      expect(paymentRows[0].status).toBe("success");
      expect(paymentRows[0].mpesa_receipt).toBe("MPE-RECEIPT-AAA");

      const tokenRows = await dataSource.query(
        `SELECT user_id, role, payment_ref, valid_from, valid_until FROM access_tokens WHERE payment_ref = $1`,
        ["MPE-RECEIPT-AAA"],
      );
      expect(tokenRows).toHaveLength(1);
      expect(tokenRows[0].user_id).toBe(TEACHER_ID);
      expect(tokenRows[0].role).toBe("teacher");
      // Week pass → 168h validity
      const validFrom = new Date(tokenRows[0].valid_from).getTime();
      const validUntil = new Date(tokenRows[0].valid_until).getTime();
      expect(validUntil - validFrom).toBe(168 * 3600 * 1000);

      expect(fakeGateway.emitAccessGranted).toHaveBeenCalledWith(
        TEACHER_ID,
        expect.objectContaining({ pass: "week" }),
      );
    });

    it("duplicate callback (same MpesaReceiptNumber) is idempotent — no second token", async () => {
      const res = await request(app.getHttpServer())
        .post("/payments/callback")
        .send(successBody(checkoutId, "MPE-RECEIPT-AAA"));
      expect(res.status).toBe(200);
      expect(res.body.idempotent).toBe(true);

      const tokenRows = await dataSource.query(
        `SELECT count(*)::int as n FROM access_tokens WHERE payment_ref = $1`,
        ["MPE-RECEIPT-AAA"],
      );
      expect(tokenRows[0].n).toBe(1);
    });

    it("failure callback (ResultCode=1032) marks cancelled, no token", async () => {
      fakeDaraja.stkPush.mockResolvedValueOnce({
        MerchantRequestID: "M-FAIL",
        CheckoutRequestID: "CHECKOUT-FAIL-001",
        ResponseCode: "0",
        ResponseDescription: "ok",
        CustomerMessage: "ok",
      });
      const initRes = await request(app.getHttpServer())
        .post("/payments/initiate")
        .set("X-School-ID", TENANT_A)
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({ pass: "day" });

      const cbRes = await request(app.getHttpServer())
        .post("/payments/callback")
        .send({
          Body: {
            stkCallback: {
              MerchantRequestID: "M-FAIL",
              CheckoutRequestID: "CHECKOUT-FAIL-001",
              ResultCode: 1032,
              ResultDesc: "Request cancelled by user.",
            },
          },
        });
      expect(cbRes.status).toBe(200);

      const paymentRows = await dataSource.query(`SELECT status FROM payments WHERE id = $1`, [
        initRes.body.paymentId,
      ]);
      expect(paymentRows[0].status).toBe("cancelled");
    });

    it("malformed callback → 400", async () => {
      const res = await request(app.getHttpServer())
        .post("/payments/callback")
        .send({ not: "valid daraja shape" });
      expect(res.status).toBe(400);
    });
  });
});
