import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import { Tenant } from "./tenant.entity.js";

/**
 * Thin repository wrapper for tenants. Centralises queries so guards and
 * services don't reach into TypeORM directly.
 */
@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly repo: Repository<Tenant>,
  ) {}

  async findById(id: string): Promise<Tenant | null> {
    return this.repo.findOne({ where: { id } });
  }
}
