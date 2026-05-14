import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import { User } from "./user.entity.js";

/**
 * Repository wrapper for users. Queries that auth and tenant logic depend on.
 *
 * Lookup by (schoolId, phone) is intentional: phone is unique within a tenant
 * but not globally, so the schoolId is part of the key.
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async findByPhoneAndSchool(phone: string, schoolId: string): Promise<User | null> {
    return this.repo.findOne({ where: { phone, schoolId } });
  }

  async findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }
}
