import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "./user.entity.js";
import { UsersService } from "./users.service.js";
import { UsersController } from "./users.controller.js";

/**
 * UsersModule consumes auth primitives (PasswordService, JwtAuthGuard,
 * RolesGuard) via the @Global() AuthModule — no explicit import needed.
 */
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
