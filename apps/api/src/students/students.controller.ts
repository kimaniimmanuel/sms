import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  StudentsService,
  type ListStudentsResult,
} from "./students.service.js";
import { CreateStudentDto } from "./dto/create-student.dto.js";
import { UpdateStudentDto } from "./dto/update-student.dto.js";
import { ListStudentsQueryDto } from "./dto/list-students.query.dto.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { Roles } from "../auth/roles.decorator.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { SchoolId } from "../common/decorators/school-id.decorator.js";
import type { Student } from "./student.entity.js";

@Controller("students")
@UseGuards(JwtAuthGuard)
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  /**
   * GET /students — list with filters and pagination.
   * Any authenticated user in the tenant may list (teachers need to see
   * the class roster).
   */
  @Get()
  async list(
    @SchoolId() schoolId: string,
    @Query() query: ListStudentsQueryDto,
  ): Promise<ListStudentsResult> {
    return this.students.list(schoolId, query);
  }

  /**
   * GET /students/:id — single-record lookup. Tenant-scoped; returns 404 if
   * the id exists in another tenant.
   */
  @Get(":id")
  async getOne(
    @SchoolId() schoolId: string,
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<Student> {
    const student = await this.students.findById(id, schoolId);
    if (!student) {
      throw new NotFoundException({
        code: "STUDENT_NOT_FOUND",
        message: "No student with that id in this tenant",
      });
    }
    return student;
  }

  /**
   * POST /students — enrol a new student. Admin only.
   */
  @Post()
  @Roles("admin")
  @UseGuards(RolesGuard)
  @HttpCode(201)
  async create(
    @SchoolId() schoolId: string,
    @Body() dto: CreateStudentDto,
  ): Promise<Student> {
    return this.students.create(schoolId, dto);
  }

  /**
   * PATCH /students/:id — partial update. Admin only.
   */
  @Patch(":id")
  @Roles("admin")
  @UseGuards(RolesGuard)
  async update(
    @SchoolId() schoolId: string,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateStudentDto,
  ): Promise<Student> {
    return this.students.update(id, schoolId, dto);
  }

  /**
   * POST /students/:id/archive — soft-delete a student (idempotent).
   * Admin only. Records are preserved so historical attendance and grades
   * keep their links.
   */
  @Post(":id/archive")
  @Roles("admin")
  @UseGuards(RolesGuard)
  @HttpCode(200)
  async archive(
    @SchoolId() schoolId: string,
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<Student> {
    return this.students.archive(id, schoolId);
  }
}
