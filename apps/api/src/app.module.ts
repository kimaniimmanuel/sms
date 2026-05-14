import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AppDataSource } from "./database/data-source.js";
import { AuthModule } from "./auth/auth.module.js";
import { UsersModule } from "./users/users.module.js";
import { TenantsModule } from "./tenants/tenants.module.js";
import { StudentsModule } from "./students/students.module.js";
import { AttendanceModule } from "./attendance/attendance.module.js";
import { HealthModule } from "./health/health.module.js";
import { TenantGuard } from "./common/guards/tenant.guard.js";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(AppDataSource.options),
    TenantsModule,
    UsersModule,
    AuthModule,
    StudentsModule,
    AttendanceModule,
    HealthModule,
  ],
  providers: [
    // Global TenantGuard — runs on every route by default. Routes that
    // legitimately cannot supply X-School-ID opt out with @SkipTenant().
    // useExisting reuses the singleton TenantGuard provided by AuthModule
    // so the guard is wired exactly once across the app.
    { provide: APP_GUARD, useExisting: TenantGuard },
  ],
})
export class AppModule {}
