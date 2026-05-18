import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { buildStkPassword, formatStkTimestamp, normalizeKenyanPhone } from "./daraja.helpers.js";

export interface StkPushOptions {
  amount: number;
  phone: string;
  accountReference: string;
  transactionDesc: string;
}

export interface StkPushResult {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

type FetchLike = typeof globalThis.fetch;

/**
 * DarajaService — thin wrapper over Safaricom's Lipa Na M-Pesa Online API.
 *
 *   - `getAccessToken()` — OAuth bearer token, cached until ~30s before expiry
 *   - `stkPush()` — initiates a Lipa Na M-Pesa Online (STK Push) request
 *
 * `fetch` is injected (defaults to global) so unit tests can replace it with
 * a mock without touching the real network.
 *
 * Required env vars (see `.env.example`):
 *   DARAJA_BASE_URL, DARAJA_CONSUMER_KEY, DARAJA_CONSUMER_SECRET,
 *   DARAJA_SHORTCODE, DARAJA_PASSKEY, DARAJA_CALLBACK_URL
 *
 * Missing credentials throw on first use, not at construction — so the app
 * boots even when only the offline parts are being exercised in dev.
 */
@Injectable()
export class DarajaService {
  private readonly logger = new Logger(DarajaService.name);
  private cachedToken: { value: string; expiresAt: number } | null = null;

  /**
   * Injectable fetch function. Defaults to globalThis.fetch (Node 20+).
   * Tests assign a mock here. Not a constructor parameter because NestJS
   * DI would attempt to resolve a provider for `FetchLike` and fail.
   */
  public fetchFn: FetchLike = globalThis.fetch;

  constructor(private readonly config: ConfigService) {}

  async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && now < this.cachedToken.expiresAt - 30_000) {
      return this.cachedToken.value;
    }

    const baseUrl = this.requireEnv("DARAJA_BASE_URL");
    const consumerKey = this.requireEnv("DARAJA_CONSUMER_KEY");
    const consumerSecret = this.requireEnv("DARAJA_CONSUMER_SECRET");
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

    const res = await this.fetchFn(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      method: "GET",
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Daraja OAuth failed: ${res.status} ${text}`);
    }
    const body = (await res.json()) as { access_token: string; expires_in: string | number };
    const expiresInSec =
      typeof body.expires_in === "string" ? parseInt(body.expires_in, 10) : body.expires_in;
    this.cachedToken = {
      value: body.access_token,
      expiresAt: now + expiresInSec * 1000,
    };
    return body.access_token;
  }

  async stkPush(opts: StkPushOptions): Promise<StkPushResult> {
    const baseUrl = this.requireEnv("DARAJA_BASE_URL");
    const shortcode = this.requireEnv("DARAJA_SHORTCODE");
    const passkey = this.requireEnv("DARAJA_PASSKEY");
    const callbackUrl = this.requireEnv("DARAJA_CALLBACK_URL");

    const accessToken = await this.getAccessToken();
    const timestamp = formatStkTimestamp(new Date());
    const password = buildStkPassword(shortcode, passkey, timestamp);
    const phone = normalizeKenyanPhone(opts.phone);

    const payload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: opts.amount,
      PartyA: phone,
      PartyB: shortcode,
      PhoneNumber: phone,
      CallBackURL: callbackUrl,
      AccountReference: opts.accountReference.slice(0, 12), // Daraja limit
      TransactionDesc: opts.transactionDesc.slice(0, 13), // Daraja limit
    };

    const res = await this.fetchFn(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`Daraja STK Push failed: ${res.status} ${text}`);
      throw new Error(`Daraja STK Push failed: ${res.status}`);
    }
    return (await res.json()) as StkPushResult;
  }

  /** Test hook: clear the cached OAuth token. */
  clearTokenCache(): void {
    this.cachedToken = null;
  }

  private requireEnv(name: string): string {
    const value = this.config.get<string>(name);
    if (!value) {
      throw new Error(`${name} is not configured — set it in .env to call Daraja`);
    }
    return value;
  }
}
