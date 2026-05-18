import "reflect-metadata";
import { DarajaService } from "./daraja.service.js";

function makeConfig(env: Record<string, string>) {
  return {
    get: jest.fn((k: string) => env[k]),
  };
}

const FULL_ENV = {
  DARAJA_BASE_URL: "https://sandbox.example",
  DARAJA_CONSUMER_KEY: "ck",
  DARAJA_CONSUMER_SECRET: "cs",
  DARAJA_SHORTCODE: "174379",
  DARAJA_PASSKEY: "pk",
  DARAJA_CALLBACK_URL: "https://x/payments/callback",
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("DarajaService.getAccessToken", () => {
  it("fetches and returns a token", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { access_token: "TKN-1", expires_in: "3599" }));
    const svc = new DarajaService(makeConfig(FULL_ENV) as never);
    svc.fetchFn = fetchMock;
    await expect(svc.getAccessToken()).resolves.toBe("TKN-1");
    const url = fetchMock.mock.calls[0]![0];
    expect(url).toContain("/oauth/v1/generate");
    expect(fetchMock.mock.calls[0]![1].headers.Authorization).toMatch(/^Basic /);
  });

  it("caches subsequent calls within the expiry window", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { access_token: "TKN-1", expires_in: 3599 }));
    const svc = new DarajaService(makeConfig(FULL_ENV) as never);
    svc.fetchFn = fetchMock;
    await svc.getAccessToken();
    await svc.getAccessToken();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("re-fetches after clearTokenCache()", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { access_token: "TKN-A", expires_in: 3599 }))
      .mockResolvedValueOnce(jsonResponse(200, { access_token: "TKN-B", expires_in: 3599 }));
    const svc = new DarajaService(makeConfig(FULL_ENV) as never);
    svc.fetchFn = fetchMock;
    await svc.getAccessToken();
    svc.clearTokenCache();
    await expect(svc.getAccessToken()).resolves.toBe("TKN-B");
  });

  it("throws when consumer key/secret are missing", async () => {
    const svc = new DarajaService(makeConfig({}) as never);
    svc.fetchFn = jest.fn();
    await expect(svc.getAccessToken()).rejects.toThrow(/DARAJA_BASE_URL/);
  });

  it("throws when Daraja returns non-2xx", async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(new Response("forbidden", { status: 403 }));
    const svc = new DarajaService(makeConfig(FULL_ENV) as never);
    svc.fetchFn = fetchMock;
    await expect(svc.getAccessToken()).rejects.toThrow(/OAuth failed: 403/);
  });
});

describe("DarajaService.stkPush", () => {
  it("calls processrequest with the expected payload shape", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { access_token: "TKN-1", expires_in: 3599 }))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          MerchantRequestID: "M-1",
          CheckoutRequestID: "C-1",
          ResponseCode: "0",
          ResponseDescription: "ok",
          CustomerMessage: "Success",
        }),
      );
    const svc = new DarajaService(makeConfig(FULL_ENV) as never);
    svc.fetchFn = fetchMock;

    const result = await svc.stkPush({
      amount: 10,
      phone: "+254712345678",
      accountReference: "sms-pay",
      transactionDesc: "Day pass",
    });

    expect(result.CheckoutRequestID).toBe("C-1");
    const pushCall = fetchMock.mock.calls[1]!;
    expect(pushCall[0]).toContain("/mpesa/stkpush/v1/processrequest");
    const body = JSON.parse(pushCall[1].body);
    expect(body.PhoneNumber).toBe("254712345678");
    expect(body.PartyA).toBe("254712345678");
    expect(body.PartyB).toBe("174379");
    expect(body.BusinessShortCode).toBe("174379");
    expect(body.Amount).toBe(10);
    expect(body.TransactionType).toBe("CustomerPayBillOnline");
    expect(body.CallBackURL).toBe("https://x/payments/callback");
    expect(body.Password).toBeTruthy();
    expect(body.Timestamp).toMatch(/^\d{14}$/);
  });

  it("propagates errors from Daraja with a clear message", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { access_token: "TKN-1", expires_in: 3599 }))
      .mockResolvedValueOnce(new Response("Bad Request", { status: 400 }));
    const svc = new DarajaService(makeConfig(FULL_ENV) as never);
    svc.fetchFn = fetchMock;
    await expect(
      svc.stkPush({
        amount: 10,
        phone: "+254712345678",
        accountReference: "ref",
        transactionDesc: "desc",
      }),
    ).rejects.toThrow(/STK Push failed: 400/);
  });
});
