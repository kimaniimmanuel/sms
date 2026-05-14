import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

/**
 * @SchoolId() injects the tenant UUID attached to the request by TenantGuard.
 * Requires TenantGuard upstream.
 *
 * @example
 *   @UseGuards(TenantGuard)
 *   @Get("students")
 *   list(@SchoolId() schoolId: string) { return this.students.list(schoolId); }
 */
export const SchoolId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<{ schoolId?: string }>();
    return request.schoolId;
  },
);
