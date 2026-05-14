import "reflect-metadata";
import { type ExecutionContext, ForbiddenException } from "@nestjs/common";
import { RolesGuard } from "./roles.guard.js";

type MockReflector = { getAllAndOverride: jest.Mock };

function makeCtx(user?: { role: "teacher" | "admin" | "finance" }) {
  const request = { user };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => () => undefined,
    getClass: () => function MockController() {},
  } as unknown as ExecutionContext;
}

describe("RolesGuard", () => {
  let reflector: MockReflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector as never);
  });

  it("allows the request when no @Roles() is declared", () => {
    reflector.getAllAndOverride.mockReturnValueOnce(undefined);
    expect(guard.canActivate(makeCtx({ role: "teacher" }))).toBe(true);
  });

  it("allows the request when @Roles() is declared empty", () => {
    reflector.getAllAndOverride.mockReturnValueOnce([]);
    expect(guard.canActivate(makeCtx({ role: "teacher" }))).toBe(true);
  });

  it("allows the request when the user's role matches", () => {
    reflector.getAllAndOverride.mockReturnValueOnce(["admin"]);
    expect(guard.canActivate(makeCtx({ role: "admin" }))).toBe(true);
  });

  it("allows the request when the user's role is in a multi-role list", () => {
    reflector.getAllAndOverride.mockReturnValueOnce(["admin", "finance"]);
    expect(guard.canActivate(makeCtx({ role: "finance" }))).toBe(true);
  });

  it("rejects with 403 INSUFFICIENT_ROLE when the role does not match", () => {
    reflector.getAllAndOverride.mockReturnValueOnce(["admin"]);
    expect(() => guard.canActivate(makeCtx({ role: "teacher" }))).toThrow(
      ForbiddenException,
    );
  });

  it("rejects with 403 NOT_AUTHENTICATED when no user is on the request", () => {
    reflector.getAllAndOverride.mockReturnValueOnce(["admin"]);
    expect(() => guard.canActivate(makeCtx(undefined))).toThrow(
      ForbiddenException,
    );
  });
});
