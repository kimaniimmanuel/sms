import {
  type CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { isAccessValid } from "@sms/core-logic";
import { AccessTokensService } from "./access-tokens.service.js";
import { TenantsService } from "../tenants/tenants.service.js";
import type { CurrentUser } from "../common/decorators/current-user.decorator.js";

/**
 * AccessGuard — enforces sync-access payment for tenant-scoped operations.
 *
 * Allows the request when:
 *   - the user has an AccessToken with validUntil > now, OR
 *   - the user is an admin on a tenant whose flatFeeStatus = 'active'
 *
 * Otherwise rejects with 402 Payment Required and an envelope the client
 * can use to drive the M-Pesa prompt:
 *   { code: "ACCESS_EXPIRED", upgradeUrl: "/pay" }
 *
 * Must run AFTER JwtAuthGuard so `request.user` is populated.
 */
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private readonly accessTokens: AccessTokensService,
    private readonly tenants: TenantsService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const request = ctx.switchToHttp().getRequest<{ user?: CurrentUser }>();
    const user = request.user;
    if (!user) {
      // Should be unreachable when JwtAuthGuard precedes us — defensive throw.
      throw new UnauthorizedException({
        code: "NOT_AUTHENTICATED",
        message: "Authentication required",
      });
    }

    // 1. Active per-user access token wins
    const token = await this.accessTokens.mostRecentForUser(user.userId);
    if (token && isAccessValid(token)) return true;

    // 2. Admin on a flat-fee-active tenant bypasses per-sync gating
    if (user.role === "admin") {
      const tenant = await this.tenants.findById(user.schoolId);
      if (tenant?.flatFeeStatus === "active") return true;
    }

    // 3. Nothing else qualifies
    throw new HttpException(
      { code: "ACCESS_EXPIRED", upgradeUrl: "/pay" },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}
