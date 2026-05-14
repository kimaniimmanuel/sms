import "reflect-metadata";
import { TenantContext } from "./tenant-context.js";

describe("TenantContext", () => {
  it("returns schoolId when the request carries one", () => {
    const ctx = new TenantContext({ schoolId: "abc" } as never);
    expect(ctx.schoolId).toBe("abc");
  });

  it("throws when schoolId is not on the request (guard didn't run)", () => {
    const ctx = new TenantContext({} as never);
    expect(() => ctx.schoolId).toThrow(/tenant-guarded request/);
  });

  it("returns the user when the request carries one", () => {
    const user = { userId: "u1", schoolId: "abc", role: "teacher" as const };
    const ctx = new TenantContext({ schoolId: "abc", user } as never);
    expect(ctx.user).toBe(user);
  });

  it("returns undefined for user on an anonymous request", () => {
    const ctx = new TenantContext({ schoolId: "abc" } as never);
    expect(ctx.user).toBeUndefined();
  });
});
