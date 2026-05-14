import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { PasswordService } from "./password.service.js";
import { JwtStrategy } from "./jwt.strategy.js";
import { JwtAuthGuard } from "./jwt-auth.guard.js";
import { RefreshToken } from "./refresh-token.entity.js";

import { UsersModule } from "../users/users.module.js";
import { TenantsModule } from "../tenants/tenants.module.js";
import { TenantGuard } from "../common/guards/tenant.guard.js";

@Module({
  imports: [
    UsersModule,
    TenantsModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: config.get<string>("JWT_ACCESS_EXPIRY") ?? "15m",
        },
      }),
    }),
    TypeOrmModule.forFeature([RefreshToken]),
  ],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, JwtStrategy, JwtAuthGuard, TenantGuard],
  exports: [AuthService, PasswordService, JwtAuthGuard, TenantGuard],
})
export class AuthModule {}

// Note: TenantGuard is registered as APP_GUARD in app.module.ts so every
// request goes through it by default. Routes that genuinely cannot carry
// X-School-ID opt out via @SkipTenant().
