import { TenantSchema } from "./tenant.js";

describe("TenantSchema", () => {
  const valid = {
    id: "01959be0-7d3a-7a4f-9b27-2d5a9f1c8a02",
    schoolName: "Riverbank Academy",
    tier: "offline" as const,
    contactPhone: "+254712345678",
    flatFeeStatus: "inactive" as const,
    createdAt: new Date("2026-01-15"),
  };

  it("parses a fully populated valid tenant", () => {
    expect(() => TenantSchema.parse(valid)).not.toThrow();
  });

  it("applies defaults: tier=offline, flatFeeStatus=inactive", () => {
    const parsed = TenantSchema.parse({
      id: valid.id,
      schoolName: valid.schoolName,
      createdAt: valid.createdAt,
    });
    expect(parsed.tier).toBe("offline");
    expect(parsed.flatFeeStatus).toBe("inactive");
  });

  it("coerces createdAt from ISO string", () => {
    const parsed = TenantSchema.parse({
      id: valid.id,
      schoolName: valid.schoolName,
      createdAt: "2026-01-15T00:00:00.000Z",
    });
    expect(parsed.createdAt).toBeInstanceOf(Date);
  });

  it("rejects invalid uuid", () => {
    expect(() =>
      TenantSchema.parse({ ...valid, id: "not-a-uuid" }),
    ).toThrow();
  });

  it("rejects empty schoolName", () => {
    expect(() => TenantSchema.parse({ ...valid, schoolName: "" })).toThrow();
  });

  it("rejects unknown extra fields (.strict())", () => {
    expect(() =>
      TenantSchema.parse({ ...valid, hackerField: "boom" }),
    ).toThrow();
  });

  it("rejects malformed phone number", () => {
    expect(() =>
      TenantSchema.parse({ ...valid, contactPhone: "0712345678" }),
    ).toThrow();
  });

  it("rejects invalid tier value", () => {
    expect(() =>
      TenantSchema.parse({ ...valid, tier: "premium" as unknown as "offline" }),
    ).toThrow();
  });
});
