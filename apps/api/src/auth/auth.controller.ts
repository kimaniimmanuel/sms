import { Body, Controller, HttpCode, Post, UseGuards } from "@nestjs/common";
import { AuthService, type AuthResult } from "./auth.service.js";
import { JwtAuthGuard } from "./jwt-auth.guard.js";
import { LoginDto } from "./dto/login.dto.js";
import { RefreshDto, LogoutDto } from "./dto/refresh.dto.js";
import { SchoolId } from "../common/decorators/school-id.decorator.js";
import { SkipTenant } from "../common/decorators/skip-tenant.decorator.js";
import {
  CurrentUser,
  type CurrentUser as CurrentUserType,
} from "../common/decorators/current-user.decorator.js";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /**
   * POST /auth/login
   * Body:   { phone, password, deviceId? }
   * Header: X-School-ID  (enforced by the global TenantGuard)
   * Returns: { accessToken, refreshToken, user, expiresIn }
   * Errors: 400 (bad header/body), 404 (tenant), 401 (invalid creds)
   */
  @Post("login")
  @HttpCode(200)
  async login(@SchoolId() schoolId: string, @Body() dto: LoginDto): Promise<AuthResult> {
    return this.auth.login(schoolId, dto.phone, dto.password, dto.deviceId);
  }

  /**
   * POST /auth/refresh
   * Body: { refreshToken }
   * Returns: { accessToken, refreshToken, user, expiresIn }
   *
   * @SkipTenant() because the refresh token alone establishes user + tenant;
   * the client may not know its X-School-ID at this point (e.g. when
   * reconnecting from cold storage).
   */
  @Post("refresh")
  @SkipTenant()
  @HttpCode(200)
  async refresh(@Body() dto: RefreshDto): Promise<AuthResult> {
    return this.auth.refresh(dto.refreshToken);
  }

  /**
   * POST /auth/logout
   * Body: { refreshToken }
   * Header: Authorization: Bearer <accessToken>
   *
   * @SkipTenant() — the JWT already carries the tenant identity.
   */
  @Post("logout")
  @SkipTenant()
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  async logout(
    @CurrentUser() user: CurrentUserType,
    @Body() dto: LogoutDto,
  ): Promise<void> {
    return this.auth.logout(dto.refreshToken, user.userId);
  }
}
