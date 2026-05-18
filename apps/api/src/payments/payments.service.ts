import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { type Repository } from "typeorm";
import { newId, type Pass, priceKES } from "@sms/core-logic";
import { Payment } from "./payment.entity.js";
import { DarajaService } from "./daraja.service.js";
import { PaymentsGateway } from "./payments.gateway.js";
import { AccessTokensService } from "../access-tokens/access-tokens.service.js";
import { UsersService } from "../users/users.service.js";
import { getMetadataItem } from "./daraja.helpers.js";
import { StkCallbackSchema, type StkCallback } from "./dto/daraja-callback.dto.js";

export interface InitiatePaymentInput {
  schoolId: string;
  userId: string;
  role: "teacher" | "admin" | "finance";
  pass: Pass;
  phone?: string;
}

export interface InitiatePaymentResult {
  paymentId: string;
  status: "pending";
  amountKes: number;
  pass: Pass;
  checkoutRequestId: string;
}

/**
 * PaymentsService — Daraja-driven sync access purchases.
 *
 * Two flows:
 *
 *   initiate()        — creates a pending row, fires STK Push, returns the
 *                        Daraja CheckoutRequestID for client tracking
 *
 *   handleCallback()  — receives Daraja's webhook. Idempotent on
 *                        MpesaReceiptNumber: duplicate callbacks update
 *                        nothing and return without re-issuing tokens.
 *                        On success, issues an AccessToken and emits
 *                        access:granted via the WebSocket gateway.
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly repo: Repository<Payment>,
    private readonly daraja: DarajaService,
    private readonly users: UsersService,
    private readonly accessTokens: AccessTokensService,
    private readonly gateway: PaymentsGateway,
  ) {}

  async initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    if (input.role === "finance") {
      throw new BadRequestException({
        code: "ROLE_NOT_PRICED",
        message: "Finance role does not purchase sync access directly",
      });
    }

    const amountKes = priceKES(input.role, input.pass);

    // Determine phone: explicit body wins; otherwise fall back to user's phone
    let phone = input.phone;
    if (!phone) {
      const user = await this.users.findById(input.userId);
      if (!user) {
        throw new NotFoundException({
          code: "USER_NOT_FOUND",
          message: "Authenticated user not found",
        });
      }
      phone = user.phone;
    }

    // 1. Create the pending payment row first — even if Daraja fails the
    // row exists for audit purposes (status stays pending; admin can mark failed)
    const id = newId();
    await this.repo.save(
      this.repo.create({
        id,
        schoolId: input.schoolId,
        userId: input.userId,
        amountKes,
        pass: input.pass,
        status: "pending",
      }),
    );

    // 2. Fire STK Push
    let checkoutRequestId: string;
    try {
      const stkResult = await this.daraja.stkPush({
        amount: amountKes,
        phone,
        accountReference: id.slice(0, 12),
        transactionDesc: `SMS ${input.pass}`,
      });
      checkoutRequestId = stkResult.CheckoutRequestID;
    } catch (err) {
      // Stash the failure on the row so the user/admin can see what happened
      await this.repo.update(
        { id },
        {
          status: "failed",
          failureReason: err instanceof Error ? err.message.slice(0, 255) : "Unknown error",
          completedAt: new Date(),
        },
      );
      throw err;
    }

    // 3. Stash the CheckoutRequestID on the row so callback can find it.
    // Stored in failureReason field for prototype — refactor to a dedicated
    // column in a future migration when adding live-Daraja support.
    await this.repo.update({ id }, { mpesaReceipt: null, failureReason: checkoutRequestId });

    return {
      paymentId: id,
      status: "pending",
      amountKes,
      pass: input.pass,
      checkoutRequestId,
    };
  }

  async handleCallback(rawBody: unknown): Promise<{ ok: true; idempotent?: boolean }> {
    let parsed: StkCallback;
    try {
      parsed = StkCallbackSchema.parse(rawBody);
    } catch (err) {
      this.logger.warn(`Rejected malformed Daraja callback: ${String(err)}`);
      // Still return 200 — Daraja shouldn't retry malformed payloads.
      throw new BadRequestException({
        code: "MALFORMED_CALLBACK",
        message: "Callback payload did not match Daraja schema",
      });
    }

    const cb = parsed.Body.stkCallback;

    // For success callbacks, idempotency comes first: if we've already
    // recorded this receipt, return without doing any work. This handles
    // the case where Daraja retries after we've successfully processed
    // (failureReason was cleared on success so the CheckoutRequestID lookup
    // wouldn't find the row otherwise).
    if (cb.ResultCode === 0) {
      const items = cb.CallbackMetadata?.Item ?? [];
      const receipt = getMetadataItem(items, "MpesaReceiptNumber");
      if (typeof receipt !== "string") {
        this.logger.warn(`Daraja success callback missing MpesaReceiptNumber`);
        return { ok: true };
      }
      const existing = await this.repo.findOne({ where: { mpesaReceipt: receipt } });
      if (existing) {
        return { ok: true, idempotent: true };
      }
    }

    // Fresh callback — find the payment by stashed CheckoutRequestID
    // (in failureReason during prototype phase; will move to a dedicated
    // column once we wire live Daraja in the MVP build).
    const payment = await this.repo.findOne({
      where: { failureReason: cb.CheckoutRequestID },
    });
    if (!payment) {
      this.logger.warn(`Daraja callback for unknown CheckoutRequestID: ${cb.CheckoutRequestID}`);
      return { ok: true };
    }

    if (cb.ResultCode === 0) {
      const items = cb.CallbackMetadata?.Item ?? [];
      const receipt = getMetadataItem(items, "MpesaReceiptNumber") as string;

      payment.mpesaReceipt = receipt;
      payment.status = "success";
      payment.failureReason = null;
      payment.completedAt = new Date();
      await this.repo.save(payment);

      // Look up user role for the access token (it's the role at issuance time)
      const user = await this.users.findById(payment.userId);
      const role = user?.role ?? "teacher";

      const accessToken = await this.accessTokens.createAccessToken({
        userId: payment.userId,
        schoolId: payment.schoolId,
        role,
        pass: payment.pass as Pass,
        paymentRef: receipt,
      });

      this.gateway.emitAccessGranted(payment.userId, {
        validUntil: accessToken.validUntil,
        pass: payment.pass as Pass,
      });

      return { ok: true };
    } else {
      payment.status = cb.ResultCode === 1032 ? "cancelled" : "failed";
      payment.failureReason = cb.ResultDesc.slice(0, 255);
      payment.completedAt = new Date();
      await this.repo.save(payment);
      return { ok: true };
    }
  }
}
