import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { type Repository } from "typeorm";
import { accessDurationHours, newId, type Pass } from "@sms/core-logic";
import { AccessToken } from "./access-token.entity.js";

export interface IssueAccessTokenInput {
  userId: string;
  schoolId: string;
  role: "teacher" | "admin" | "finance";
  pass: Pass;
  paymentRef: string;
  validFrom?: Date;
}

/**
 * AccessTokensService — issues time-bound sync-access tokens.
 *
 * The validity window is derived from `accessDurationHours(pass)` in
 * @sms/core-logic — single source of truth across the codebase.
 * No timezone math here: tokens are absolute timestamps.
 */
@Injectable()
export class AccessTokensService {
  constructor(
    @InjectRepository(AccessToken)
    private readonly repo: Repository<AccessToken>,
  ) {}

  async createAccessToken(input: IssueAccessTokenInput): Promise<AccessToken> {
    const validFrom = input.validFrom ?? new Date();
    const hours = accessDurationHours(input.pass);
    const validUntil = new Date(validFrom.getTime() + hours * 3600 * 1000);

    return this.repo.save(
      this.repo.create({
        id: newId(),
        userId: input.userId,
        schoolId: input.schoolId,
        role: input.role,
        validFrom,
        validUntil,
        paymentRef: input.paymentRef,
      }),
    );
  }

  /**
   * Returns the user's most recent token (by validUntil DESC). Used by
   * AccessGuard in Epic E10-002.
   */
  async mostRecentForUser(userId: string): Promise<AccessToken | null> {
    return this.repo.findOne({
      where: { userId },
      order: { validUntil: "DESC" },
    });
  }
}
