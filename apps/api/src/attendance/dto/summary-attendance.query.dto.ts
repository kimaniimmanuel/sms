import { IsDateString, IsOptional } from "class-validator";

/**
 * Query params for GET /attendance/summary.
 *
 *   ?date=YYYY-MM-DD   — defaults to today in Africa/Nairobi when omitted
 */
export class SummaryAttendanceQueryDto {
  @IsOptional()
  @IsDateString()
  date?: string;
}
