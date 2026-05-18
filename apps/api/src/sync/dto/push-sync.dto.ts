import { Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsOptional, ValidateNested } from "class-validator";
import { AttendanceEntryDto } from "../../attendance/dto/bulk-submit-attendance.dto.js";

/**
 * Body for POST /sync/push.
 *
 * Each top-level key is an entity type. The prototype demo only syncs
 * attendance, but the shape leaves room for `students`, `payments`, etc.
 * The server processes each list with the same validation and
 * tenant-scoping rules used by the direct endpoints.
 *
 * Up to 1000 attendance rows per request — a full term of daily rolls
 * for a small school fits comfortably.
 */
export class PushSyncDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  attendance?: AttendanceEntryDto[];
}
