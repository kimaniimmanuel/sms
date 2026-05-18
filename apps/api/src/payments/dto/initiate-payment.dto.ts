import { IsEnum, IsOptional, IsString, Matches } from "class-validator";

const PASSES = ["day", "week", "month"] as const;

/**
 * POST /payments/initiate body.
 *
 * `phone` defaults to the user's stored M-Pesa phone if omitted, but the
 * client may override to send the STK Push to a different number (e.g. a
 * parent paying on behalf of a teacher).
 */
export class InitiatePaymentDto {
  @IsEnum(PASSES, { message: `pass must be one of: ${PASSES.join(", ")}` })
  pass!: (typeof PASSES)[number];

  @IsOptional()
  @IsString()
  @Matches(/^(\+\d{6,15}|07\d{8}|01\d{8})$/, {
    message: "phone must be E.164 or 07xxxxxxxx / 01xxxxxxxx",
  })
  phone?: string;
}
