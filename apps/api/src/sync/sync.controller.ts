import { Body, Controller, HttpCode, Post, UseGuards } from "@nestjs/common";
import { AttendanceService } from "../attendance/attendance.service.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { AccessGuard } from "../access-tokens/access.guard.js";
import { SchoolId } from "../common/decorators/school-id.decorator.js";
import {
  CurrentUser,
  type CurrentUser as CurrentUserType,
} from "../common/decorators/current-user.decorator.js";
import { PushSyncDto } from "./dto/push-sync.dto.js";

/**
 * Sync — the gated write surface for clients pushing offline-captured data.
 *
 * Guarded by AccessGuard. Returns 402 `ACCESS_EXPIRED` when the user has no
 * valid time-bound access token AND is not on an active flat-fee plan.
 *
 * Implementation note: rather than duplicating per-entity logic, the
 * endpoint delegates to the existing feature services (AttendanceService
 * today, StudentsService and others later). One sync, many entities,
 * single validation path.
 */
@Controller("sync")
@UseGuards(JwtAuthGuard, AccessGuard)
export class SyncController {
  constructor(private readonly attendance: AttendanceService) {}

  /**
   * POST /sync/push
   *
   * Body: `{ attendance: [...] }` (more entity types in future).
   * Returns per-entity counts for the client to mark rows clean locally.
   */
  @Post("push")
  @HttpCode(200)
  async push(
    @SchoolId() schoolId: string,
    @CurrentUser() user: CurrentUserType,
    @Body() dto: PushSyncDto,
  ): Promise<{ attendance: { count: number } | null }> {
    let attendanceResult: { count: number } | null = null;
    if (dto.attendance && dto.attendance.length > 0) {
      const r = await this.attendance.bulkSubmit(schoolId, user.userId, dto.attendance);
      attendanceResult = { count: r.count };
    }
    return { attendance: attendanceResult };
  }
}
