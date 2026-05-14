import "reflect-metadata";
import { TenantsService } from "./tenants.service.js";

describe("TenantsService", () => {
  function setup(found: unknown) {
    const repo = { findOne: jest.fn().mockResolvedValue(found) };
    const svc = new TenantsService(repo as never);
    return { svc, repo };
  }

  it("returns the tenant row when found", async () => {
    const tenant = { id: "01959be0-7d3a-7a4f-9b27-2d5a9f1c8a01", schoolName: "Riverbank" };
    const { svc, repo } = setup(tenant);
    await expect(svc.findById(tenant.id)).resolves.toBe(tenant);
    expect(repo.findOne).toHaveBeenCalledWith({ where: { id: tenant.id } });
  });

  it("returns null when no row matches", async () => {
    const { svc } = setup(null);
    await expect(svc.findById("missing")).resolves.toBeNull();
  });
});
