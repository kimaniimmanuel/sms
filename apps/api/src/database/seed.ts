import "reflect-metadata";
import "dotenv/config";
import bcrypt from "bcrypt";
import { newId } from "@sms/core-logic";

import { AppDataSource } from "./data-source.js";
import { Tenant } from "../tenants/tenant.entity.js";
import { User } from "../users/user.entity.js";

const SEED_PHONE = "+254700000001";
const SEED_PASSWORD = "Password123!";
const SEED_SCHOOL_NAME = "Demo Primary School";
const SEED_ADMIN_NAME = "Demo Admin";

async function seed(): Promise<void> {
  await AppDataSource.initialize();

  const tenantRepo = AppDataSource.getRepository(Tenant);
  const userRepo = AppDataSource.getRepository(User);

  let tenant = await tenantRepo.findOne({ where: { schoolName: SEED_SCHOOL_NAME } });
  if (!tenant) {
    tenant = tenantRepo.create({
      id: newId(),
      schoolName: SEED_SCHOOL_NAME,
      tier: "offline",
      contactName: SEED_ADMIN_NAME,
      contactPhone: SEED_PHONE,
      flatFeeStatus: "active",
    });
    await tenantRepo.save(tenant);
  }

  let admin = await userRepo.findOne({
    where: { schoolId: tenant.id, phone: SEED_PHONE },
  });
  if (!admin) {
    admin = userRepo.create({
      id: newId(),
      schoolId: tenant.id,
      name: SEED_ADMIN_NAME,
      phone: SEED_PHONE,
      role: "admin",
      passwordHash: await bcrypt.hash(SEED_PASSWORD, 12),
      isActive: true,
    });
    await userRepo.save(admin);
  }

  console.info("\n=== Seed complete ===");
  console.info(`Tenant (X-School-ID): ${tenant.id}`);
  console.info(`School name:          ${tenant.schoolName}`);
  console.info(`Admin phone:          ${SEED_PHONE}`);
  console.info(`Admin password:       ${SEED_PASSWORD}`);
  console.info("\nLogin via POST /auth/login with header X-School-ID and body");
  console.info(`  { "phone": "${SEED_PHONE}", "password": "${SEED_PASSWORD}" }`);
  console.info("=====================\n");

  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
