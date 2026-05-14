import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

const VALID_ROLES = ["teacher", "admin", "finance"] as const;

/**
 * Body for POST /users. Admin creates a new user inside their own tenant.
 *
 * `schoolId` is NOT in the body — it's taken from the JWT/X-School-ID
 * combination so an admin cannot smuggle in a different tenant's id by
 * tampering with the request body.
 */
export class CreateUserDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @IsString()
  @Matches(/^\+\d{6,15}$/, {
    message: "phone must be E.164 (e.g. +254712345678)",
  })
  phone!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsEnum(VALID_ROLES, { message: `role must be one of: ${VALID_ROLES.join(", ")}` })
  role!: (typeof VALID_ROLES)[number];

  @IsString()
  @MinLength(8, { message: "password must be at least 8 characters" })
  password!: string;
}
