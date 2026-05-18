import "reflect-metadata";
import { BadRequestException } from "@nestjs/common";
import { PaymentsService } from "./payments.service.js";

const SCHOOL_ID = "01959be0-7d3a-7a4f-9b27-2d5a9f1f9101";
const USER_ID = "01959be0-7d3a-7a4f-9b27-2d5a9f1f9102";
const PAYMENT_ID = "01959be0-7d3a-7a4f-9b27-2d5a9f1f9103";
const CHECKOUT_ID = "ws_CO_191220191020363925";
const RECEIPT = "NLJ7RT61SV";

function setup(
  opts: {
    paymentFound?: unknown;
    existingByReceipt?: unknown;
    userFound?: unknown;
    stkResult?: unknown;
    stkError?: Error;
  } = {},
) {
  const repo = {
    create: jest.fn((data: unknown) => data),
    save: jest.fn(async (data: Record<string, unknown>) => ({ ...data, createdAt: new Date() })),
    update: jest.fn(async () => ({ affected: 1 })),
    findOne: jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
      if (where.failureReason === CHECKOUT_ID) return opts.paymentFound ?? null;
      if (where.mpesaReceipt === RECEIPT) return opts.existingByReceipt ?? null;
      return null;
    }),
  };
  const daraja = {
    stkPush: opts.stkError
      ? jest.fn().mockRejectedValue(opts.stkError)
      : jest.fn().mockResolvedValue(
          opts.stkResult ?? {
            CheckoutRequestID: CHECKOUT_ID,
            MerchantRequestID: "M-1",
            ResponseCode: "0",
            ResponseDescription: "ok",
            CustomerMessage: "ok",
          },
        ),
  };
  const users = {
    findById: jest.fn().mockResolvedValue(opts.userFound ?? null),
  };
  const accessTokens = {
    createAccessToken: jest.fn().mockResolvedValue({
      validUntil: new Date(Date.now() + 24 * 3600 * 1000),
    }),
  };
  const gateway = {
    emitAccessGranted: jest.fn(),
  };
  const svc = new PaymentsService(
    repo as never,
    daraja as never,
    users as never,
    accessTokens as never,
    gateway as never,
  );
  return { svc, repo, daraja, users, accessTokens, gateway };
}

describe("PaymentsService.initiate", () => {
  it("creates a pending payment, fires STK Push, returns CheckoutRequestID", async () => {
    const ctx = setup({ userFound: { id: USER_ID, phone: "+254712345678" } });
    const result = await ctx.svc.initiate({
      schoolId: SCHOOL_ID,
      userId: USER_ID,
      role: "teacher",
      pass: "day",
    });

    expect(ctx.daraja.stkPush).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 10, phone: "+254712345678" }),
    );
    expect(result.amountKes).toBe(10);
    expect(result.status).toBe("pending");
    expect(result.checkoutRequestId).toBe(CHECKOUT_ID);
    // First save: insert the pending row
    expect(ctx.repo.save).toHaveBeenCalled();
    // Second update: stash CheckoutRequestID
    expect(ctx.repo.update).toHaveBeenCalledWith(
      { id: expect.any(String) },
      expect.objectContaining({ failureReason: CHECKOUT_ID }),
    );
  });

  it("uses admin pricing when role=admin", async () => {
    const ctx = setup({ userFound: { id: USER_ID, phone: "+254712345678" } });
    const result = await ctx.svc.initiate({
      schoolId: SCHOOL_ID,
      userId: USER_ID,
      role: "admin",
      pass: "month",
    });
    expect(result.amountKes).toBe(600);
    expect(ctx.daraja.stkPush).toHaveBeenCalledWith(expect.objectContaining({ amount: 600 }));
  });

  it("rejects finance role with 400 ROLE_NOT_PRICED", async () => {
    const ctx = setup();
    await expect(
      ctx.svc.initiate({
        schoolId: SCHOOL_ID,
        userId: USER_ID,
        role: "finance",
        pass: "day",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("uses explicit phone from body when provided", async () => {
    const ctx = setup();
    await ctx.svc.initiate({
      schoolId: SCHOOL_ID,
      userId: USER_ID,
      role: "teacher",
      pass: "day",
      phone: "+254700000099",
    });
    expect(ctx.daraja.stkPush).toHaveBeenCalledWith(
      expect.objectContaining({ phone: "+254700000099" }),
    );
    expect(ctx.users.findById).not.toHaveBeenCalled();
  });

  it("marks payment failed when Daraja STK Push throws", async () => {
    const ctx = setup({
      userFound: { id: USER_ID, phone: "+254712345678" },
      stkError: new Error("Daraja down"),
    });
    await expect(
      ctx.svc.initiate({
        schoolId: SCHOOL_ID,
        userId: USER_ID,
        role: "teacher",
        pass: "day",
      }),
    ).rejects.toThrow("Daraja down");
    expect(ctx.repo.update).toHaveBeenCalledWith(
      { id: expect.any(String) },
      expect.objectContaining({
        status: "failed",
        failureReason: expect.stringContaining("Daraja down"),
      }),
    );
  });
});

describe("PaymentsService.handleCallback", () => {
  const successCallback = {
    Body: {
      stkCallback: {
        MerchantRequestID: "M-1",
        CheckoutRequestID: CHECKOUT_ID,
        ResultCode: 0,
        ResultDesc: "ok",
        CallbackMetadata: {
          Item: [
            { Name: "Amount", Value: 10 },
            { Name: "MpesaReceiptNumber", Value: RECEIPT },
            { Name: "TransactionDate", Value: 20260515110000 },
            { Name: "PhoneNumber", Value: 254712345678 },
          ],
        },
      },
    },
  };

  const failureCallback = {
    Body: {
      stkCallback: {
        MerchantRequestID: "M-1",
        CheckoutRequestID: CHECKOUT_ID,
        ResultCode: 1032,
        ResultDesc: "Request cancelled by user.",
      },
    },
  };

  it("marks payment success, issues access token, emits access:granted", async () => {
    const ctx = setup({
      paymentFound: {
        id: PAYMENT_ID,
        userId: USER_ID,
        schoolId: SCHOOL_ID,
        pass: "day",
        status: "pending",
      },
      userFound: { id: USER_ID, role: "teacher" },
    });

    const result = await ctx.svc.handleCallback(successCallback);
    expect(result.ok).toBe(true);

    expect(ctx.accessTokens.createAccessToken).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER_ID,
        schoolId: SCHOOL_ID,
        role: "teacher",
        pass: "day",
        paymentRef: RECEIPT,
      }),
    );
    expect(ctx.gateway.emitAccessGranted).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({ pass: "day" }),
    );
    expect(ctx.repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: "success", mpesaReceipt: RECEIPT }),
    );
  });

  it("is idempotent — duplicate callback for the same MpesaReceiptNumber does not re-issue tokens", async () => {
    const ctx = setup({
      paymentFound: {
        id: PAYMENT_ID,
        userId: USER_ID,
        schoolId: SCHOOL_ID,
        pass: "day",
        status: "success",
        mpesaReceipt: RECEIPT,
      },
      existingByReceipt: { id: PAYMENT_ID, mpesaReceipt: RECEIPT },
      userFound: { id: USER_ID, role: "teacher" },
    });

    const result = await ctx.svc.handleCallback(successCallback);
    expect(result.idempotent).toBe(true);
    expect(ctx.accessTokens.createAccessToken).not.toHaveBeenCalled();
    expect(ctx.gateway.emitAccessGranted).not.toHaveBeenCalled();
  });

  it("ignores callbacks for unknown CheckoutRequestID (returns 200 quietly)", async () => {
    const ctx = setup({ paymentFound: null });
    const result = await ctx.svc.handleCallback(successCallback);
    expect(result.ok).toBe(true);
    expect(ctx.accessTokens.createAccessToken).not.toHaveBeenCalled();
  });

  it("ResultCode=1032 marks payment cancelled (no token)", async () => {
    const ctx = setup({
      paymentFound: {
        id: PAYMENT_ID,
        userId: USER_ID,
        schoolId: SCHOOL_ID,
        pass: "day",
        status: "pending",
      },
    });
    const result = await ctx.svc.handleCallback(failureCallback);
    expect(result.ok).toBe(true);
    expect(ctx.repo.save).toHaveBeenCalledWith(expect.objectContaining({ status: "cancelled" }));
    expect(ctx.accessTokens.createAccessToken).not.toHaveBeenCalled();
  });

  it("non-1032 non-zero ResultCode marks payment failed", async () => {
    const ctx = setup({
      paymentFound: {
        id: PAYMENT_ID,
        userId: USER_ID,
        schoolId: SCHOOL_ID,
        pass: "day",
        status: "pending",
      },
    });
    const otherFailure = {
      Body: {
        stkCallback: {
          MerchantRequestID: "M-1",
          CheckoutRequestID: CHECKOUT_ID,
          ResultCode: 2001,
          ResultDesc: "Wrong PIN",
        },
      },
    };
    await ctx.svc.handleCallback(otherFailure);
    expect(ctx.repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: "failed", failureReason: "Wrong PIN" }),
    );
  });

  it("rejects malformed callback shape with 400 MALFORMED_CALLBACK", async () => {
    const ctx = setup();
    await expect(ctx.svc.handleCallback({ not: "valid" })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
