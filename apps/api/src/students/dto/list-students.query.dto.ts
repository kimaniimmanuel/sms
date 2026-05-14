import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

/**
 * Query params for GET /students. All optional.
 *
 *   ?grade=Grade%204             exact match
 *   ?search=mary                 case-insensitive substring on name
 *   ?page=1&pageSize=50          pagination (page-size capped at 200)
 *   ?includeArchived=true        include soft-deleted students
 */
export class ListStudentsQueryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  grade?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number;

  /**
   * Query strings carry booleans as text. Transform "true"/"1" → true,
   * everything else → false, before @IsBoolean checks the result.
   */
  @IsOptional()
  @Transform(({ value }) => value === "true" || value === "1" || value === true)
  @IsBoolean()
  includeArchived?: boolean;
}
