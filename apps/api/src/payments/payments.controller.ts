import { Body, Controller, HttpCode, Post, UseGuards } from "@nestjs/common";
import { PaymentsService, type InitiatePaymentResult } from "./payments.service.js";
import { InitiatePaymentDto } from "./dto/initiate-payment.dto.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { Roles } from "../auth/roles.decorator.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { SchoolId } from "../common/decorators/school-id.decorator.js";
import {
  CurrentUser,
  type CurrentUser as CurrentUserType,
} from "../common/decorators/current-user.decorator.js";
import { SkipTenant } from "../common/decorators/skip-tenant.decorator.js";

@Controller("payments")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  /**
   * POST /payments/initiate
   * Starts the M-Pesa STK Push flow for the authenticated user.
   * Only teachers and admins can purchase; finance is rejected at the service.
   */
  @Post("initiate")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("teacher", "admin")
  @HttpCode(202)
  async initiate(
    @SchoolId() schoolId: string,
    @CurrentUser() user: CurrentUserType,
    @Body() dto: InitiatePaymentDto,
  ): Promise<InitiatePaymentResult> {
    return this.payments.initiate({
      schoolId,
      userId: user.userId,
      role: user.role,
      pass: dto.pass,
      phone: dto.phone,
    });
  }

  /**
   * POST /payments/callback
   *
   * Daraja webhook. No authentication: Safaricom can't know our tenants or
   * users. @SkipTenant() because X-School-ID is also unavailable. In
   * production, lock this down at the network layer (IP allowlist of
   * Safaricom's published callback IP ranges) — TODO Epic E9 MVP.
   *
   * Always returns 200 so Daraja stops retrying. Errors are logged.
   */
  @Post("callback")
  @SkipTenant()
  @HttpCode(200)
  async callback(@Body() body: unknown): Promise<{ ok: true; idempotent?: boolean }> {
    return this.payments.handleCallback(body);
  }
}
