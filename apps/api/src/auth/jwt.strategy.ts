import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { UsersService } from "../users/users.service.js";
import type { CurrentUser } from "../common/decorators/current-user.decorator.js";

interface JwtPayload {
  sub: string;
  schoolId: string;
  role: "teacher" | "admin" | "finance";
}

/**
 * Passport JWT strategy. Validates the bearer token's signature and expiry,
 * resolves the user from the DB, and asserts that the JWT's schoolId matches
 * the X-School-ID header (defence-in-depth against cross-tenant requests).
 *
 * Whatever validate() returns is attached to request.user — consumed by
 * @CurrentUser() downstream.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    private readonly users: UsersService,
    config: ConfigService,
  ) {
    const secret = config.get<string>("JWT_SECRET");
    if (!secret) throw new Error("JWT_SECRET is not configured");
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true,
    });
  }

  async validate(
    req: { headers: Record<string, string | string[] | undefined>; schoolId?: string },
    payload: JwtPayload,
  ): Promise<CurrentUser> {
    const user = await this.users.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException({ code: "USER_NOT_FOUND" });
    }
    if (user.schoolId !== payload.schoolId) {
      throw new UnauthorizedException({ code: "TENANT_MISMATCH" });
    }

    // Cross-tenant defence: header must match JWT's schoolId when present
    const headerRaw = req.headers["x-school-id"];
    const header = Array.isArray(headerRaw) ? headerRaw[0] : headerRaw;
    if (header && header !== payload.schoolId) {
      throw new UnauthorizedException({ code: "TENANT_MISMATCH" });
    }

    return {
      userId: user.id,
      schoolId: user.schoolId,
      role: user.role,
    };
  }
}
