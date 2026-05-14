import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from "@nestjs/common";
import {
  AttendanceService,
  type BulkSubmitResult,
  type DailySummary,
  type ListAttendanceResult,
} from "./attendance.service.js";
import { BulkSubmitAttendanceDto } from "./dto/bulk-submit-attendance.dto.js";
import { ListAttendanceQueryDto } from "./dto/list-attendance.query.dto.js";
import { SummaryAttendanceQueryDto } from "./dto/summary-attendance.query.dto.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { Roles } from "../auth/roles.decorator.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { SchoolId } from "../common/decorators/school-id.decorator.js";
import {
  CurrentUser,
  type CurrentUser as CurrentUserType,
} from "../common/decorators/current-user.decorator.js";

@Controller("attendance")
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  /**
   * POST /attendance — bulk-submit a class roll.
   * Teachers and admins only (finance does not take attendance).
   *
   * The teacher_id is taken from the JWT, NOT the body — a teacher cannot
   * submit attendance "as" someone else.
   */
  @Post()
  @Roles("teacher", "admin")
  @UseGuards(RolesGuard)
  @HttpCode(200)
  async submit(
    @SchoolId() schoolId: string,
    @CurrentUser() user: CurrentUserType,
    @Body() dto: BulkSubmitAttendanceDto,
  ): Promise<BulkSubmitResult> {
    return this.attendance.bulkSubmit(schoolId, user.userId, dto.entries);
  }

  /**
   * GET /attendance — paginated, filterable list. Any authenticated user
   * inside the tenant.
   */
  @Get()
  async list(
    @SchoolId() schoolId: string,
    @Query() query: ListAttendanceQueryDto,
  ): Promise<ListAttendanceResult> {
    return this.attendance.list(schoolId, query);
  }

  /**
   * GET /attendance/summary — daily counts broken down by grade.
   * Defaults to today (Africa/Nairobi) when no date supplied.
   */
  @Get("summary")
  async summary(
    @SchoolId() schoolId: string,
    @Query() query: SummaryAttendanceQueryDto,
  ): Promise<DailySummary> {
    return this.attendance.dailySummary(schoolId, query.date);
  }
}
