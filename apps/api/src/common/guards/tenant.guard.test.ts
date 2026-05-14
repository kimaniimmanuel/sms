import "reflect-metadata";
import {
  BadRequestException,
  type ExecutionContext,
  NotFoundException,
} from "@nestjs/common";
import { TenantGuard } from "./tenant.guard.js";

type MockTenantsService = { findById: jest.Mock };
type MockReflector = { getAllAndOverride: jest.Mock };

function makeCtx(headers: Record<string, string | undefined>) {
  const request: { headers: typeof headers; schoolId?: string } = { headers };
  const handler = () => undefined;
  const klass = function MockController() {};
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => handler,
    getClass: () => klass,
    request,
  } as unknown as ExecutionContext & { request: typeof request };
}

const VALID_UUID = "01959be0-7d3a-7a4f-9b27-2d5a9f1c8a01";

describe("TenantGuard", () => {
  let tenants: MockTenantsService;
  let reflector: MockReflector;
  let guard: TenantGuard;

  beforeEach(() => {
    tenants = { findById: jest.fn() };
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) };
    guard = new TenantGuard(tenants as never, reflector as never);
  });

  it("returns true and bypasses validation when @SkipTenant() is set", async () => {
    reflector.getAllAndOverride.mockReturnValueOnce(true);
    const ctx = makeCtx({});
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(tenants.findById).not.toHaveBeenCalled();
  });

  it("rejects with 400 (MISSING_SCHOOL_ID) when the header is absent", async () => {
    const ctx = makeCtx({});
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(BadRequestException);
    expect(tenants.findById).not.toHaveBeenCalled();
  });

  it("rejects with 400 (INVALID_SCHOOL_ID) when the header is malformed", async () => {
    const ctx = makeCtx({ "x-school-id": "not-a-uuid" });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(BadRequestException);
    expect(tenants.findById).not.toHaveBeenCalled();
  });

  it("rejects with 404 (SCHOOL_NOT_FOUND) when the tenant does not exist", async () => {
    tenants.findById.mockResolvedValueOnce(null);
    const ctx = makeCtx({ "x-school-id": VALID_UUID });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(NotFoundException);
    expect(tenants.findById).toHaveBeenCalledWith(VALID_UUID);
  });

  it("attaches schoolId to the request and returns true on a valid header", async () => {
    tenants.findById.mockResolvedValueOnce({ id: VALID_UUID });
    const ctx = makeCtx({ "x-school-id": VALID_UUID });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(ctx.request.schoolId).toBe(VALID_UUID);
  });

  it("consults the reflector with both handler and class targets", async () => {
    tenants.findById.mockResolvedValueOnce({ id: VALID_UUID });
    const ctx = makeCtx({ "x-school-id": VALID_UUID });
    await guard.canActivate(ctx);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([expect.anything(), expect.anything()]),
    );
  });
});
