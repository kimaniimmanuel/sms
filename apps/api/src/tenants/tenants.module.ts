import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Tenant } from "./tenant.entity.js";
import { TenantsService } from "./tenants.service.js";
import { TenantsController } from "./tenants.controller.js";
import { TenantContext } from "./tenant-context.js";

@Module({
  imports: [TypeOrmModule.forFeature([Tenant])],
  controllers: [TenantsController],
  providers: [TenantsService, TenantContext],
  exports: [TenantsService, TenantContext],
})
export class TenantsModule {}
