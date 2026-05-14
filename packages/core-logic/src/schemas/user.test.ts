import { UserSchema, UserRole } from "./user.js";

describe("UserSchema", () => {
  const valid = {
    id: "01959be0-7d3a-7a4f-9b27-2d5a9f1c8a02",
    schoolId: "01959be0-7d3a-7a4f-9b27-2d5a9f1c8a03",
    name: "John Otieno",
    phone: "+254712345678",
    role: "teacher" as const,
    isActive: true,
    createdAt: new Date(),
  };

  it("parses a valid teacher user", () => {
    expect(() => UserSchema.parse(valid)).not.toThrow();
  });

  it("accepts each of teacher | admin | finance", () => {
    for (const role of ["teacher", "admin", "finance"] as const) {
      expect(() => UserSchema.parse({ ...valid, role })).not.toThrow();
    }
  });

  it("defaults isActive=true when omitted", () => {
    const parsed = UserSchema.parse({
      id: valid.id,
      schoolId: valid.schoolId,
      name: valid.name,
      phone: valid.phone,
      role: valid.role,
      createdAt: valid.createdAt,
    });
    expect(parsed.isActive).toBe(true);
  });

  it("rejects unknown role", () => {
    expect(() =>
      UserSchema.parse({ ...valid, role: "principal" as unknown as "teacher" }),
    ).toThrow();
  });

  it("rejects missing schoolId (multi-tenant rule)", () => {
    const { schoolId: _, ...withoutSchoolId } = valid;
    expect(() =>
      UserSchema.parse(withoutSchoolId as unknown as typeof valid),
    ).toThrow();
  });

  it("rejects empty name", () => {
    expect(() => UserSchema.parse({ ...valid, name: "" })).toThrow();
  });

  it("rejects malformed phone", () => {
    expect(() =>
      UserSchema.parse({ ...valid, phone: "0712345678" }),
    ).toThrow();
  });

  it("accepts optional email when present and well-formed", () => {
    expect(() =>
      UserSchema.parse({ ...valid, email: "john@example.com" }),
    ).not.toThrow();
  });

  it("rejects malformed email", () => {
    expect(() =>
      UserSchema.parse({ ...valid, email: "not-an-email" }),
    ).toThrow();
  });

  it("exposes the role enum as a runtime value (UserRole)", () => {
    expect(UserRole.options).toEqual(["teacher", "admin", "finance"]);
  });
});
