import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccessToken } from "./access-token.entity.js";
import { AccessTokensService } from "./access-tokens.service.js";
import { AccessGuard } from "./access.guard.js";
import { TenantsModule } from "../tenants/tenants.module.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([AccessToken]),
    // AccessGuard checks the tenant's flat-fee status for admin bypass.
    TenantsModule,
  ],
  providers: [AccessTokensService, AccessGuard],
  // Re-export TenantsModule so consumers (e.g. SyncModule using AccessGuard)
  // get TenantsService transitively. Without this, NestJS DI can't resolve
  // AccessGuard's constructor in the consumer's context.
  exports: [AccessTokensService, AccessGuard, TenantsModule],
})
export class AccessTokensModule {}
