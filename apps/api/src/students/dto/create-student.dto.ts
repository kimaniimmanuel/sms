import {
  IsDateString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateStudentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  grade!: string;

  /** ISO date YYYY-MM-DD. Server stores as a date column. */
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @Matches(/^\+\d{6,15}$/, {
    message: "guardianPhone must be E.164 (e.g. +254712345678)",
  })
  guardianPhone?: string;
}
