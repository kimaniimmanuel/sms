import { Inject, Injectable, Scope } from "@nestjs/common";
import { REQUEST } from "@nestjs/core";
import type { Request } from "express";
import type { CurrentUser } from "../common/decorators/current-user.decorator.js";

type TenantedRequest = Request & {
  schoolId?: string;
  user?: CurrentUser;
};

/**
 * TenantContext — request-scoped façade over the multi-tenant request fields.
 *
 * Services that need the current tenant identity inject this and read
 * `tenantContext.schoolId` rather than threading the value through every
 * method signature.
 *
 * Scope.REQUEST means a fresh instance per HTTP request — both the wrapped
 * `Request` and the `schoolId` reflect the live request state at construction
 * time.
 *
 * Anything that depends on TenantContext also becomes request-scoped
 * (NestJS DI rule). For singletons that occasionally need tenant context,
 * prefer the @SchoolId() controller decorator and pass schoolId explicitly.
 */
@Injectable({ scope: Scope.REQUEST })
export class TenantContext {
  constructor(@Inject(REQUEST) private readonly request: TenantedRequest) {}

  /**
   * Current tenant UUID. Throws if accessed before TenantGuard has attached
   * a schoolId — i.e. on routes that are @SkipTenant()-marked or where the
   * guard hasn't run yet.
   */
  get schoolId(): string {
    if (!this.request.schoolId) {
      throw new Error(
        "TenantContext.schoolId accessed outside a tenant-guarded request",
      );
    }
    return this.request.schoolId;
  }

  /**
   * The authenticated user payload, if any. Undefined on anonymous routes.
   */
  get user(): CurrentUser | undefined {
    return this.request.user;
  }
}
