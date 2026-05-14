import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from "class-validator";

const STATUSES = ["present", "absent", "late"] as const;

/**
 * One row in the bulk-submit payload. The `teacher_id` is taken from the JWT,
 * not the body — a teacher can't post attendance "as" someone else.
 */
export class AttendanceEntryDto {
  @IsUUID()
  studentId!: string;

  /** YYYY-MM-DD (a DATE column on the server). */
  @IsDateString()
  date!: string;

  @IsEnum(STATUSES, { message: `status must be one of: ${STATUSES.join(", ")}` })
  status!: (typeof STATUSES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

/**
 * POST /attendance body. Bulk submission of a class roll.
 *
 * The server upserts on (studentId, date) — re-submitting identical rows
 * is idempotent. Sized at up to 500 entries per request to comfortably
 * cover the largest realistic class. Larger imports go through a future
 * bulk-CSV endpoint (Epic E7-005).
 */
export class BulkSubmitAttendanceDto {
  @IsArray()
  @ArrayMinSize(1, { message: "entries must contain at least one row" })
  @ArrayMaxSize(500, { message: "entries cannot exceed 500 rows per request" })
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  entries!: AttendanceEntryDto[];
}
