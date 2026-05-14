import {
  IsDateString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

/**
 * Partial update body. Every field is optional; only the fields present
 * in the request are mutated.
 *
 * To clear an optional field (e.g. unlink a guardian phone), send an empty
 * string — the service converts that to NULL.
 */
export class UpdateStudentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  grade?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(\+\d{6,15})?$/, {
    message: "guardianPhone must be E.164 or empty to clear",
  })
  guardianPhone?: string;
}
