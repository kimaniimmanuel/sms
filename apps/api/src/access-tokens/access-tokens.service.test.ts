import "reflect-metadata";
import { AccessTokensService } from "./access-tokens.service.js";

function setup() {
  const repo = {
    create: jest.fn((data: unknown) => data),
    save: jest.fn(async (data: Record<string, unknown>) => ({
      ...data,
      createdAt: new Date(),
    })),
    findOne: jest.fn().mockResolvedValue(null),
  };
  const svc = new AccessTokensService(repo as never);
  return { svc, repo };
}

const USER_ID = "01959be0-7d3a-7a4f-9b27-2d5a9f1f9001";
const SCHOOL_ID = "01959be0-7d3a-7a4f-9b27-2d5a9f1f9002";

describe("AccessTokensService.createAccessToken", () => {
  it("computes validUntil = validFrom + duration(pass) for a day pass (24h)", async () => {
    const { svc } = setup();
    const validFrom = new Date("2026-05-15T12:00:00Z");
    const token = await svc.createAccessToken({
      userId: USER_ID,
      schoolId: SCHOOL_ID,
      role: "teacher",
      pass: "day",
      paymentRef: "MPE12345",
      validFrom,
    });
    expect(token.validUntil.getTime() - validFrom.getTime()).toBe(24 * 3600 * 1000);
  });

  it.each([
    ["day", 24],
    ["week", 24 * 7],
    ["month", 24 * 30],
  ] as const)("for a %s pass adds %i hours", async (pass, hours) => {
    const { svc } = setup();
    const validFrom = new Date("2026-05-15T12:00:00Z");
    const token = await svc.createAccessToken({
      userId: USER_ID,
      schoolId: SCHOOL_ID,
      role: "admin",
      pass,
      paymentRef: "MPE12345",
      validFrom,
    });
    expect(token.validUntil.getTime() - validFrom.getTime()).toBe(hours * 3600 * 1000);
  });

  it("defaults validFrom to now when not supplied", async () => {
    const { svc } = setup();
    const before = Date.now();
    const token = await svc.createAccessToken({
      userId: USER_ID,
      schoolId: SCHOOL_ID,
      role: "teacher",
      pass: "day",
      paymentRef: "MPE12345",
    });
    const after = Date.now();
    expect(token.validFrom.getTime()).toBeGreaterThanOrEqual(before);
    expect(token.validFrom.getTime()).toBeLessThanOrEqual(after);
  });

  it("assigns a fresh UUID v7 id", async () => {
    const { svc } = setup();
    const token = await svc.createAccessToken({
      userId: USER_ID,
      schoolId: SCHOOL_ID,
      role: "teacher",
      pass: "day",
      paymentRef: "MPE12345",
    });
    expect(token.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});

describe("AccessTokensService.mostRecentForUser", () => {
  it("queries by userId ordered by validUntil DESC", async () => {
    const { svc, repo } = setup();
    await svc.mostRecentForUser(USER_ID);
    expect(repo.findOne).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      order: { validUntil: "DESC" },
    });
  });
});
