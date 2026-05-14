import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from "@nestjs/common";
import { UsersService, type PublicUser } from "./users.service.js";
import { CreateUserDto } from "./dto/create-user.dto.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { Roles } from "../auth/roles.decorator.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { SchoolId } from "../common/decorators/school-id.decorator.js";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /**
   * GET /users — list users in the current tenant.
   * Any authenticated user inside the tenant may list (so teachers can see
   * the staff roster, etc.). Tightening this to admin-only is a one-line
   * change once that becomes a requirement.
   */
  @Get()
  async list(@SchoolId() schoolId: string): Promise<PublicUser[]> {
    return this.users.listForSchool(schoolId);
  }

  /**
   * POST /users — admin creates a new user inside the current tenant.
   * The schoolId is taken from the request (TenantGuard), NOT the body —
   * an admin cannot create a user in another tenant by tampering.
   */
  @Post()
  @Roles("admin")
  @UseGuards(RolesGuard)
  @HttpCode(201)
  async create(
    @SchoolId() schoolId: string,
    @Body() dto: CreateUserDto,
  ): Promise<PublicUser> {
    return this.users.create(schoolId, dto);
  }
}
