import { createHash, randomBytes } from "node:crypto";
import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import { newId } from "@sms/core-logic";

import { PasswordService } from "./password.service.js";
import { RefreshToken } from "./refresh-token.entity.js";
import { UsersService } from "../users/users.service.js";
import type { User } from "../users/user.entity.js";

interface JwtPayload {
  sub: string; // userId
  schoolId: string;
  role: "teacher" | "admin" | "finance";
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    schoolId: string;
    name: string;
    phone: string;
    role: "teacher" | "admin" | "finance";
  };
  expiresIn: number; // seconds until accessToken exp
}

/**
 * AuthService — login, refresh, logout.
 *
 * Refresh tokens are 32-byte random hex strings; only the SHA-256 hash is
 * stored. On refresh, the incoming token is hashed and looked up; if it
 * matches a non-revoked, non-expired row, the old row is marked revoked and
 * a new row is inserted (rotation).
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly passwords: PasswordService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshRepo: Repository<RefreshToken>,
  ) {}

  async login(
    schoolId: string,
    phone: string,
    password: string,
    deviceId?: string,
  ): Promise<AuthResult> {
    const user = await this.users.findByPhoneAndSchool(phone, schoolId);
    if (!user || !user.isActive) {
      // Same error for both cases — don't leak whether the phone exists
      throw new UnauthorizedException({
        code: "INVALID_CREDENTIALS",
        message: "Invalid phone or password",
      });
    }
    const passwordOk = await this.passwords.compare(password, user.passwordHash);
    if (!passwordOk) {
      throw new UnauthorizedException({
        code: "INVALID_CREDENTIALS",
        message: "Invalid phone or password",
      });
    }
    return this.issueTokens(user, deviceId);
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    const tokenHash = hashToken(refreshToken);
    const row = await this.refreshRepo.findOne({ where: { tokenHash } });

    if (!row || row.revokedAt || row.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException({
        code: "INVALID_REFRESH_TOKEN",
        message: "Refresh token is invalid, expired, or revoked",
      });
    }

    const user = await this.users.findById(row.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException({
        code: "INVALID_REFRESH_TOKEN",
        message: "Refresh token is invalid, expired, or revoked",
      });
    }

    // Rotate: revoke the old one, issue new pair
    row.revokedAt = new Date();
    await this.refreshRepo.save(row);

    return this.issueTokens(user, row.deviceId ?? undefined);
  }

  async logout(refreshToken: string, userId: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    const row = await this.refreshRepo.findOne({ where: { tokenHash } });
    if (!row) return; // already gone — logout is idempotent
    if (row.userId !== userId) {
      throw new ForbiddenException({
        code: "REFRESH_TOKEN_MISMATCH",
        message: "Refresh token does not belong to the authenticated user",
      });
    }
    if (!row.revokedAt) {
      row.revokedAt = new Date();
      await this.refreshRepo.save(row);
    }
  }

  // ----- internals -----

  private async issueTokens(user: User, deviceId?: string): Promise<AuthResult> {
    const payload: JwtPayload = {
      sub: user.id,
      schoolId: user.schoolId,
      role: user.role,
    };
    const accessExpiry = this.config.get<string>("JWT_ACCESS_EXPIRY") ?? "15m";
    const refreshExpiryDays = parseInt(
      this.config.get<string>("JWT_REFRESH_EXPIRY")?.replace(/d$/, "") ?? "7",
      10,
    );

    const accessToken = await this.jwt.signAsync(payload, { expiresIn: accessExpiry });
    const refreshToken = randomBytes(32).toString("hex");
    const tokenHash = hashToken(refreshToken);

    const expiresAt = new Date(Date.now() + refreshExpiryDays * 24 * 3600 * 1000);

    await this.refreshRepo.insert({
      id: newId(),
      userId: user.id,
      schoolId: user.schoolId,
      tokenHash,
      expiresAt,
      deviceId: deviceId ?? null,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        schoolId: user.schoolId,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
      expiresIn: parseExpiryToSeconds(accessExpiry),
    };
  }
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function parseExpiryToSeconds(s: string): number {
  const match = /^(\d+)\s*(s|m|h|d)$/i.exec(s);
  if (!match) return parseInt(s, 10);
  const value = parseInt(match[1]!, 10);
  const unit = match[2]!.toLowerCase();
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return value * (multipliers[unit] ?? 1);
}
