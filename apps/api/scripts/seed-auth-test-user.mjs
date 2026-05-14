// One-off script to seed a tenant + admin user for testing the auth flow.
// Run with: node scripts/seed-auth-test-user.mjs
import "reflect-metadata";
import "dotenv/config";
import bcrypt from "bcrypt";
import { AppDataSource } from "../dist/database/data-source.js";

const SCHOOL_ID = "01959be0-7d3a-7a4f-9b27-2d5a9f1c8a01";
const USER_ID = "01959be0-7d3a-7a4f-9b27-2d5a9f1c8a02";

await AppDataSource.initialize();
try {
  const tenant = AppDataSource.getRepository("Tenant");
  const user = AppDataSource.getRepository("User");

  await tenant.upsert(
    {
      id: SCHOOL_ID,
      schoolName: "Riverbank Academy",
      tier: "sync-enabled",
      flatFeeStatus: "active",
    },
    ["id"],
  );

  const passwordHash = await bcrypt.hash("admin-secret", 12);
  await user.upsert(
    {
      id: USER_ID,
      schoolId: SCHOOL_ID,
      name: "Mary Wanjiku",
      phone: "+254712345678",
      role: "admin",
      passwordHash,
      isActive: true,
    },
    ["id"],
  );

  console.info(JSON.stringify({ schoolId: SCHOOL_ID, userId: USER_ID, phone: "+254712345678", password: "admin-secret" }, null, 2));
} finally {
  await AppDataSource.destroy();
}
