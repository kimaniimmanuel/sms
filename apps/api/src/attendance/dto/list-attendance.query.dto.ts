import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from "class-validator";

const STATUSES = ["present", "absent", "late"] as const;

/**
 * Query params for GET /attendance. All optional. With no filters, returns
 * the most recent page of records for the tenant.
 *
 *   ?date=YYYY-MM-DD
 *   ?studentId=<uuid>
 *   ?teacherId=<uuid>
 *   ?status=present|absent|late
 *   ?page=1&pageSize=50           pagination (page-size capped at 500)
 */
export class ListAttendanceQueryDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsUUID()
  studentId?: string;

  @IsOptional()
  @IsUUID()
  teacherId?: string;

  @IsOptional()
  @IsEnum(STATUSES)
  status?: (typeof STATUSES)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  pageSize?: number;
}
