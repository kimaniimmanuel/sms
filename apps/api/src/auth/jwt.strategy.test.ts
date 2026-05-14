import "reflect-metadata";
import { UnauthorizedException } from "@nestjs/common";
import { JwtStrategy } from "./jwt.strategy.js";

const SCHOOL_ID = "01959be0-7d3a-7a4f-9b27-2d5a9f1c8a01";
const USER_ID = "01959be0-7d3a-7a4f-9b27-2d5a9f1c8a02";

function makeStrategy(opts: { user?: unknown }) {
  const users = { findById: jest.fn().mockResolvedValue(opts.user ?? null) };
  const config = { get: jest.fn((k: string) => (k === "JWT_SECRET" ? "secret" : undefined)) };
  const strategy = new JwtStrategy(users as never, config as never);
  return { strategy, users };
}

describe("JwtStrategy", () => {
  it("throws if JWT_SECRET is missing at construction time", () => {
    const users = { findById: jest.fn() };
    const config = { get: jest.fn(() => undefined) };
    expect(() => new JwtStrategy(users as never, config as never)).toThrow(/JWT_SECRET/);
  });

  it("validate() returns the CurrentUser shape on a valid token", async () => {
    const { strategy } = makeStrategy({
      user: { id: USER_ID, schoolId: SCHOOL_ID, role: "teacher", isActive: true },
    });
    const req = { headers: { "x-school-id": SCHOOL_ID } };
    const result = await strategy.validate(req, { sub: USER_ID, schoolId: SCHOOL_ID, role: "teacher" });
    expect(result).toEqual({ userId: USER_ID, schoolId: SCHOOL_ID, role: "teacher" });
  });

  it("rejects when the user no longer exists in the DB", async () => {
    const { strategy } = makeStrategy({ user: null });
    const req = { headers: { "x-school-id": SCHOOL_ID } };
    await expect(
      strategy.validate(req, { sub: USER_ID, schoolId: SCHOOL_ID, role: "teacher" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects when the user is deactivated", async () => {
    const { strategy } = makeStrategy({
      user: { id: USER_ID, schoolId: SCHOOL_ID, role: "teacher", isActive: false },
    });
    const req = { headers: { "x-school-id": SCHOOL_ID } };
    await expect(
      strategy.validate(req, { sub: USER_ID, schoolId: SCHOOL_ID, role: "teacher" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects when JWT.schoolId differs from the user's actual schoolId", async () => {
    const { strategy } = makeStrategy({
      user: { id: USER_ID, schoolId: "different", role: "teacher", isActive: true },
    });
    const req = { headers: { "x-school-id": SCHOOL_ID } };
    await expect(
      strategy.validate(req, { sub: USER_ID, schoolId: SCHOOL_ID, role: "teacher" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects when X-School-ID header is set and disagrees with JWT.schoolId", async () => {
    const { strategy } = makeStrategy({
      user: { id: USER_ID, schoolId: SCHOOL_ID, role: "teacher", isActive: true },
    });
    const req = { headers: { "x-school-id": "01959be0-7d3a-7a4f-9b27-2d5a9f1c8a99" } };
    await expect(
      strategy.validate(req, { sub: USER_ID, schoolId: SCHOOL_ID, role: "teacher" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("allows the request when no X-School-ID header is supplied (JWT-only)", async () => {
    const { strategy } = makeStrategy({
      user: { id: USER_ID, schoolId: SCHOOL_ID, role: "teacher", isActive: true },
    });
    const req = { headers: {} };
    await expect(
      strategy.validate(req, { sub: USER_ID, schoolId: SCHOOL_ID, role: "teacher" }),
    ).resolves.toMatchObject({ userId: USER_ID });
  });
});
