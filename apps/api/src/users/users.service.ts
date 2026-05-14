import {
  ConflictException,
  Injectable,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { QueryFailedError, type Repository } from "typeorm";
import { newId } from "@sms/core-logic";
import { User } from "./user.entity.js";
import { PasswordService } from "../auth/password.service.js";

/**
 * Shape returned to clients. Excludes server-only fields like passwordHash
 * so they never appear in API responses. Matches the public UserSchema in
 * @sms/core-logic in spirit.
 */
export interface PublicUser {
  id: string;
  schoolId: string;
  name: string;
  phone: string;
  email: string | null;
  role: "teacher" | "admin" | "finance";
  isActive: boolean;
  createdAt: Date;
}

function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    schoolId: user.schoolId,
    name: user.name,
    phone: user.phone,
    email: user.email ?? null,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}

/**
 * UsersService — owns user persistence. Centralises queries so guards,
 * controllers, and the auth layer all read users the same way.
 *
 * `findByPhoneAndSchool` queries by (phone, schoolId) because phone is
 * unique within a tenant, not globally.
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
    private readonly passwords: PasswordService,
  ) {}

  async findByPhoneAndSchool(phone: string, schoolId: string): Promise<User | null> {
    return this.repo.findOne({ where: { phone, schoolId } });
  }

  async findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  async listForSchool(schoolId: string): Promise<PublicUser[]> {
    const rows = await this.repo.find({
      where: { schoolId },
      order: { createdAt: "DESC" },
    });
    return rows.map(toPublicUser);
  }

  /**
   * Create a new user inside the given tenant. Throws ConflictException
   * (409) if the phone is already taken by another user in the same
   * tenant — the DB's composite unique on (school_id, phone) is the
   * source of truth.
   */
  async create(
    schoolId: string,
    input: {
      name: string;
      phone: string;
      email?: string;
      role: "teacher" | "admin" | "finance";
      password: string;
    },
  ): Promise<PublicUser> {
    const passwordHash = await this.passwords.hash(input.password);
    try {
      const inserted = await this.repo.save(
        this.repo.create({
          id: newId(),
          schoolId,
          name: input.name,
          phone: input.phone,
          email: input.email ?? null,
          role: input.role,
          passwordHash,
          isActive: true,
        }),
      );
      return toPublicUser(inserted);
    } catch (err: unknown) {
      if (err instanceof QueryFailedError) {
        const driverErr = err.driverError as { code?: string; constraint?: string } | undefined;
        // Postgres unique_violation
        if (driverErr?.code === "23505") {
          throw new ConflictException({
            code: "USER_PHONE_TAKEN",
            message: "A user with this phone already exists in this school",
          });
        }
      }
      throw err;
    }
  }
}
