import {
  Controller,
  Get,
  NotFoundException,
  UseGuards,
} from "@nestjs/common";
import { TenantsService } from "./tenants.service.js";
import { TenantContext } from "./tenant-context.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";

/**
 * Tenant endpoints. `GET /tenants/me` returns the current tenant's profile
 * — the cheapest endpoint to verify that the full request pipeline
 * (TenantGuard → JwtAuthGuard → TenantContext) is wired correctly.
 *
 * This endpoint is what the cross-tenant rejection e2e test drives.
 */
@Controller("tenants")
export class TenantsController {
  constructor(
    private readonly tenants: TenantsService,
    private readonly tenantContext: TenantContext,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async getMyTenant() {
    const tenant = await this.tenants.findById(this.tenantContext.schoolId);
    if (!tenant) {
      // Should be unreachable — TenantGuard already verified the tenant exists.
      throw new NotFoundException({
        code: "SCHOOL_NOT_FOUND",
        message: "Tenant disappeared between guard and controller",
      });
    }
    return {
      id: tenant.id,
      schoolName: tenant.schoolName,
      tier: tenant.tier,
      contactName: tenant.contactName,
      contactPhone: tenant.contactPhone,
      flatFeeStatus: tenant.flatFeeStatus,
      createdAt: tenant.createdAt,
    };
  }
}
