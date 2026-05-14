import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * Thin wrapper around Passport's JWT auth guard. Apply to any controller or
 * route that requires an authenticated user.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}
