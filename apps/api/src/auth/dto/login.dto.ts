import { IsOptional, IsString, Matches, MinLength } from "class-validator";

/**
 * Login request body. The tenant is identified by the X-School-ID header
 * (TenantGuard handles validation); the body carries only the credentials.
 */
export class LoginDto {
  @IsString()
  @Matches(/^\+\d{6,15}$/, { message: "phone must be E.164 (e.g. +254712345678)" })
  phone!: string;

  @IsString()
  @MinLength(1)
  password!: string;

  // Optional client-supplied device identifier (mobile/desktop installation).
  // When present, recorded on the refresh token; used later for device audit.
  @IsOptional()
  @IsString()
  @MinLength(1)
  deviceId?: string;
}
