import { AccessTokenSchema } from "./access.js";

describe("AccessTokenSchema", () => {
  const now = new Date("2026-05-13T12:00:00.000Z");
  const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000);

  const valid = {
    id: "01959be0-7d3a-7a4f-9b27-2d5a9f1c8a02",
    userId: "01959be0-7d3a-7a4f-9b27-2d5a9f1c8a03",
    schoolId: "01959be0-7d3a-7a4f-9b27-2d5a9f1c8a04",
    role: "teacher" as const,
    validFrom: now,
    validUntil: tomorrow,
    paymentRef: "MPE12345ABC",
    createdAt: now,
  };

  it("parses a valid access token", () => {
    expect(() => AccessTokenSchema.parse(valid)).not.toThrow();
  });

  it("rejects when validUntil ≤ validFrom", () => {
    expect(() =>
      AccessTokenSchema.parse({
        ...valid,
        validUntil: valid.validFrom,
      }),
    ).toThrow();

    expect(() =>
      AccessTokenSchema.parse({
        ...valid,
        validUntil: new Date(valid.validFrom.getTime() - 1000),
      }),
    ).toThrow();
  });

  it("rejects empty paymentRef", () => {
    expect(() => AccessTokenSchema.parse({ ...valid, paymentRef: "" })).toThrow();
  });

  it("rejects missing userId", () => {
    const { userId: _, ...withoutUserId } = valid;
    expect(() =>
      AccessTokenSchema.parse(withoutUserId as unknown as typeof valid),
    ).toThrow();
  });

  it("rejects unknown role values", () => {
    expect(() =>
      AccessTokenSchema.parse({
        ...valid,
        role: "parent" as unknown as "teacher",
      }),
    ).toThrow();
  });

  it("coerces validFrom/validUntil from ISO strings", () => {
    const parsed = AccessTokenSchema.parse({
      ...valid,
      validFrom: "2026-05-13T12:00:00.000Z",
      validUntil: "2026-05-14T12:00:00.000Z",
    });
    expect(parsed.validFrom).toBeInstanceOf(Date);
    expect(parsed.validUntil).toBeInstanceOf(Date);
  });
});
