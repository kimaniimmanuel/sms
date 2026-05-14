import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

/**
 * The shape the JwtStrategy attaches to request.user. Keep in sync with
 * `JwtStrategy.validate()`'s return value.
 */
export interface CurrentUser {
  userId: string;
  schoolId: string;
  role: "teacher" | "admin" | "finance";
}

/**
 * @CurrentUser() injects the authenticated user payload into a controller
 * handler. Requires JwtAuthGuard upstream — using without guards yields
 * undefined and is almost certainly a bug.
 *
 * @example
 *   @UseGuards(JwtAuthGuard)
 *   @Get("me")
 *   me(@CurrentUser() user: CurrentUser) { return user; }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUser | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: CurrentUser }>();
    return request.user;
  },
);
