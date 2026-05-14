import {
  accessDurationHours,
  isAccessValid,
  PASS_DURATION_HOURS,
  PRICE_KES,
  priceKES,
  type Pass,
  type PricedRole,
} from "./access.js";
import type { AccessToken } from "../schemas/access.js";

describe("accessDurationHours", () => {
  it("returns 24 for day", () => {
    expect(accessDurationHours("day")).toBe(24);
  });

  it("returns 168 for week", () => {
    expect(accessDurationHours("week")).toBe(168);
  });

  it("returns 720 for month", () => {
    expect(accessDurationHours("month")).toBe(720);
  });

  it("throws on unknown pass", () => {
    expect(() => accessDurationHours("year" as unknown as Pass)).toThrow();
  });

  it("uses the PASS_DURATION_HOURS table directly", () => {
    for (const pass of ["day", "week", "month"] as Pass[]) {
      expect(accessDurationHours(pass)).toBe(PASS_DURATION_HOURS[pass]);
    }
  });
});

describe("priceKES", () => {
  const expectedTable: Record<PricedRole, Record<Pass, number>> = {
    teacher: { day: 10, week: 50, month: 150 },
    admin: { day: 50, week: 200, month: 600 },
  };

  it.each([
    ["teacher", "day", 10],
    ["teacher", "week", 50],
    ["teacher", "month", 150],
    ["admin", "day", 50],
    ["admin", "week", 200],
    ["admin", "month", 600],
  ] as const)("priceKES(%s, %s) === %i", (role, pass, expected) => {
    expect(priceKES(role, pass)).toBe(expected);
  });

  it("covers the full (role × pass) matrix matching the expected table", () => {
    for (const role of ["teacher", "admin"] as PricedRole[]) {
      for (const pass of ["day", "week", "month"] as Pass[]) {
        expect(priceKES(role, pass)).toBe(expectedTable[role][pass]);
      }
    }
  });

  it("throws on unknown role", () => {
    expect(() => priceKES("finance" as unknown as PricedRole, "day")).toThrow();
  });

  it("throws on unknown pass", () => {
    expect(() => priceKES("teacher", "year" as unknown as Pass)).toThrow();
  });

  it("PRICE_KES table is frozen (immutable)", () => {
    expect(Object.isFrozen(PRICE_KES)).toBe(true);
    expect(Object.isFrozen(PRICE_KES.teacher)).toBe(true);
  });
});

describe("isAccessValid", () => {
  const now = new Date("2026-05-13T12:00:00.000Z");

  const token = (validUntil: Date): AccessToken => ({
    id: "01959be0-7d3a-7a4f-9b27-2d5a9f1c8a02",
    userId: "01959be0-7d3a-7a4f-9b27-2d5a9f1c8a03",
    schoolId: "01959be0-7d3a-7a4f-9b27-2d5a9f1c8a04",
    role: "teacher",
    validFrom: new Date(now.getTime() - 3600_000),
    validUntil,
    paymentRef: "MPE12345ABC",
    createdAt: new Date(now.getTime() - 3600_000),
  });

  it("returns true when validUntil is in the future", () => {
    const t = token(new Date(now.getTime() + 1000));
    expect(isAccessValid(t, now)).toBe(true);
  });

  it("returns false when validUntil equals now (strict boundary)", () => {
    const t = token(new Date(now));
    expect(isAccessValid(t, now)).toBe(false);
  });

  it("returns false when validUntil is in the past", () => {
    const t = token(new Date(now.getTime() - 1));
    expect(isAccessValid(t, now)).toBe(false);
  });

  it("defaults the now argument to the wall clock when omitted", () => {
    const t = token(new Date(Date.now() + 60_000));
    expect(isAccessValid(t)).toBe(true);
  });

  it("returns true at one millisecond before expiry", () => {
    const t = token(new Date(now.getTime() + 1));
    expect(isAccessValid(t, now)).toBe(true);
  });
});
