import { Module } from "@nestjs/common";
import { SyncController } from "./sync.controller.js";
import { AttendanceModule } from "../attendance/attendance.module.js";
import { AccessTokensModule } from "../access-tokens/access-tokens.module.js";

/**
 * SyncModule wires the AccessGuard to the actual sync write paths. It
 * imports AttendanceModule for the AttendanceService (and any future
 * sync targets like StudentsModule) and AccessTokensModule for the guard.
 */
@Module({
  imports: [AttendanceModule, AccessTokensModule],
  controllers: [SyncController],
})
export class SyncModule {}
