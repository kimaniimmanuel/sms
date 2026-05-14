import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { CurrentUser } from "../common/decorators/current-user.decorator.js";
import { ROLES_KEY, type Role } from "./roles.decorator.js";

/**
 * RolesGuard — checks that the authenticated user's role is in the list
 * declared by @Roles(). If no @Roles() is set, the guard is permissive
 * (the route just requires authentication, not a specific role).
 *
 * Must run AFTER JwtAuthGuard (so request.user is populated). NestJS
 * processes guards in declared order — list JwtAuthGuard first.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!required || required.length === 0) return true;

    const request = ctx.switchToHttp().getRequest<{ user?: CurrentUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException({
        code: "NOT_AUTHENTICATED",
        message: "Authentication required",
      });
    }
    if (!required.includes(user.role)) {
      throw new ForbiddenException({
        code: "INSUFFICIENT_ROLE",
        message: `Requires one of: ${required.join(", ")}`,
      });
    }
    return true;
  }
}
