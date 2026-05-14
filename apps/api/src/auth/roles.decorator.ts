import { SetMetadata } from "@nestjs/common";

export type Role = "teacher" | "admin" | "finance";

/**
 * Metadata key the RolesGuard reads. Exported so guard and tests use the
 * exact same string.
 */
export const ROLES_KEY = "roles";

/**
 * @Roles('admin', 'finance') — restricts a controller or handler to users
 * whose JWT-payload role is in the given list. Requires JwtAuthGuard upstream
 * to populate `request.user`.
 *
 * Order matters in NestJS DI:
 *   @UseGuards(JwtAuthGuard, RolesGuard)   // JWT first, then role check
 *
 * @example
 *   @Roles('admin')
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Post()
 *   create(@Body() dto: CreateUserDto) { ... }
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
