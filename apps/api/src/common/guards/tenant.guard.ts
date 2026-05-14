import {
  BadRequestException,
  type CanActivate,
  type ExecutionContext,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { TenantsService } from "../../tenants/tenants.service.js";
import { SKIP_TENANT_KEY } from "../decorators/skip-tenant.decorator.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-7][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * TenantGuard — first line of multi-tenant defence.
 *
 *   1. Honour `@SkipTenant()` opt-out (for /auth/refresh, /auth/logout, etc.).
 *   2. Read `X-School-ID` header.
 *   3. Reject with 400 if missing or malformed.
 *   4. Reject with 404 if no matching tenant.
 *   5. Attach `schoolId` to the request (consumed downstream by @SchoolId()
 *      and TenantContext).
 *
 * Registered as an APP_GUARD in `app.module.ts`, so by default every route
 * is protected. Routes that genuinely cannot carry X-School-ID must opt out
 * with @SkipTenant() — that decision is deliberate, not accidental.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly tenants: TenantsService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_TENANT_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (skip) return true;

    const request = ctx
      .switchToHttp()
      .getRequest<Request & { schoolId?: string }>();

    const header = request.headers["x-school-id"];
    const schoolId = Array.isArray(header) ? header[0] : header;

    if (!schoolId) {
      throw new BadRequestException({
        code: "MISSING_SCHOOL_ID",
        message: "X-School-ID header is required",
      });
    }

    if (!UUID_REGEX.test(schoolId)) {
      throw new BadRequestException({
        code: "INVALID_SCHOOL_ID",
        message: "X-School-ID is not a valid UUID",
      });
    }

    const tenant = await this.tenants.findById(schoolId);
    if (!tenant) {
      throw new NotFoundException({
        code: "SCHOOL_NOT_FOUND",
        message: "No tenant matches the supplied X-School-ID",
      });
    }

    request.schoolId = schoolId;
    return true;
  }
}
