import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Attendance } from "./attendance.entity.js";
import { Student } from "../students/student.entity.js";
import { AttendanceService } from "./attendance.service.js";
import { AttendanceController } from "./attendance.controller.js";

/**
 * AttendanceModule registers BOTH the Attendance and Student entities for
 * injection — the service joins them for the daily summary and validates
 * student ownership on bulk-submit.
 *
 * JwtAuthGuard and RolesGuard come from the @Global() AuthModule.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Attendance, Student])],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
