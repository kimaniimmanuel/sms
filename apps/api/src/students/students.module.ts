import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Student } from "./student.entity.js";
import { StudentsService } from "./students.service.js";
import { StudentsController } from "./students.controller.js";

/**
 * StudentsModule consumes auth primitives (JwtAuthGuard, RolesGuard)
 * via the @Global() AuthModule — no explicit import required.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Student])],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
