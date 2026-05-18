import "reflect-metadata";
import { type ExecutionContext, HttpException, UnauthorizedException } from "@nestjs/common";
import { AccessGuard } from "./access.guard.js";

const SCHOOL_ID = "01959be0-7d3a-7a4f-9b27-2d5a9f1f9a01";
const USER_ID = "01959be0-7d3a-7a4f-9b27-2d5a9f1f9a02";

function makeCtx(user?: {
  userId: string;
  schoolId: string;
  role: "teacher" | "admin" | "finance";
}) {
  const request = { user };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function setup(opts: {
  token?: { validUntil: Date } | null;
  tenant?: { flatFeeStatus: string } | null;
}) {
  const accessTokens = {
    mostRecentForUser: jest.fn().mockResolvedValue(opts.token ?? null),
  };
  const tenants = {
    findById: jest.fn().mockResolvedValue(opts.tenant ?? null),
  };
  const guard = new AccessGuard(accessTokens as never, tenants as never);
  return { guard, accessTokens, tenants };
}

describe("AccessGuard", () => {
  const teacher = { userId: USER_ID, schoolId: SCHOOL_ID, role: "teacher" as const };
  const admin = { userId: USER_ID, schoolId: SCHOOL_ID, role: "admin" as const };

  it("rejects with 401 when no user on the request (JwtAuthGuard missing upstream)", async () => {
    const { guard } = setup({});
    await expect(guard.canActivate(makeCtx(undefined))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("allows when the user has a token with validUntil in the future", async () => {
    const future = new Date(Date.now() + 60_000);
    const { guard } = setup({ token: { validUntil: future } });
    await expect(guard.canActivate(makeCtx(teacher))).resolves.toBe(true);
  });

  it("rejects with 402 ACCESS_EXPIRED when the token has expired", async () => {
    const past = new Date(Date.now() - 1000);
    const { guard } = setup({ token: { validUntil: past } });
    try {
      await guard.canActivate(makeCtx(teacher));
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException);
      const httpErr = err as HttpException;
      expect(httpErr.getStatus()).toBe(402);
      expect(httpErr.getResponse()).toEqual({
        code: "ACCESS_EXPIRED",
        upgradeUrl: "/pay",
      });
    }
  });

  it("rejects with 402 when the user has no token at all", async () => {
    const { guard } = setup({ token: null });
    await expect(guard.canActivate(makeCtx(teacher))).rejects.toBeInstanceOf(HttpException);
  });

  it("BYPASS: admin on a flat-fee-active tenant always passes", async () => {
    const past = new Date(Date.now() - 1000);
    const { guard } = setup({
      token: { validUntil: past },
      tenant: { flatFeeStatus: "active" },
    });
    await expect(guard.canActivate(makeCtx(admin))).resolves.toBe(true);
  });

  it("admin on a flat-fee-INACTIVE tenant still needs a valid token", async () => {
    const past = new Date(Date.now() - 1000);
    const { guard } = setup({
      token: { validUntil: past },
      tenant: { flatFeeStatus: "inactive" },
    });
    await expect(guard.canActivate(makeCtx(admin))).rejects.toBeInstanceOf(HttpException);
  });

  it("teachers do NOT get the flat-fee bypass even on active-flat-fee tenants", async () => {
    const past = new Date(Date.now() - 1000);
    const { guard } = setup({
      token: { validUntil: past },
      tenant: { flatFeeStatus: "active" },
    });
    await expect(guard.canActivate(makeCtx(teacher))).rejects.toBeInstanceOf(HttpException);
  });
});
