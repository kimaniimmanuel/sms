/**
 * Demo seed — Riverbank Academy.
 *
 * One-command setup for the stakeholder demo:
 *   pnpm --filter @sms/api seed
 *
 * Idempotent: re-running deletes the demo tenant's rows and re-creates them,
 * so the demo always starts from a known state. Other tenants' data is
 * untouched.
 *
 * Outputs:
 *   - 1 tenant (Riverbank Academy, Nakuru) — flatFeeStatus = active
 *   - 4 users: 1 admin, 2 teachers, 1 finance — shared password "Password123!"
 *   - 30 students across Grades 3–6, realistic Kenyan names
 *   - ~300 attendance rows covering the last 10 school days
 *   - 3 access tokens — one expired, one flat-fee-active (admin), one fresh
 */
import "reflect-metadata";
import "dotenv/config";
import bcrypt from "bcrypt";
import { newId } from "@sms/core-logic";

import { AppDataSource } from "./data-source.js";
import { Tenant } from "../tenants/tenant.entity.js";
import { User } from "../users/user.entity.js";
import { Student } from "../students/student.entity.js";
import { Attendance } from "../attendance/attendance.entity.js";
import { AccessToken } from "../access-tokens/access-token.entity.js";
import { KENYA_TZ, todayInTimeZone } from "../common/date.js";

// Stable IDs so re-runs hit the same rows and demo credentials never change.
const TENANT_ID = "01970000-0000-7000-8000-000000000001";
const ADMIN_ID = "01970000-0000-7000-8000-000000000010";
const TEACHER1_ID = "01970000-0000-7000-8000-000000000011";
const TEACHER2_ID = "01970000-0000-7000-8000-000000000012";
const FINANCE_ID = "01970000-0000-7000-8000-000000000013";

const PASSWORD = "Password123!";

interface SeedUser {
  id: string;
  name: string;
  phone: string;
  role: "admin" | "teacher" | "finance";
}

const USERS: SeedUser[] = [
  { id: ADMIN_ID, name: "Mary Wanjiku", phone: "+254700000001", role: "admin" },
  { id: TEACHER1_ID, name: "John Otieno", phone: "+254700000002", role: "teacher" },
  { id: TEACHER2_ID, name: "Sarah Achieng", phone: "+254700000003", role: "teacher" },
  { id: FINANCE_ID, name: "Grace Mwende", phone: "+254700000004", role: "finance" },
];

// 30 students, realistic Kenyan first + surname mix, spread across Grades 3–6.
interface SeedStudent {
  name: string;
  grade: "Grade 3" | "Grade 4" | "Grade 5" | "Grade 6";
}
const STUDENTS: SeedStudent[] = [
  // Grade 3 (8)
  { name: "Brian Mwangi", grade: "Grade 3" },
  { name: "Faith Otieno", grade: "Grade 3" },
  { name: "Kevin Wanjiru", grade: "Grade 3" },
  { name: "Mercy Kamau", grade: "Grade 3" },
  { name: "Joseph Ochieng", grade: "Grade 3" },
  { name: "Naomi Njoroge", grade: "Grade 3" },
  { name: "David Akinyi", grade: "Grade 3" },
  { name: "Esther Mutua", grade: "Grade 3" },
  // Grade 4 (8)
  { name: "Peter Wambui", grade: "Grade 4" },
  { name: "Jane Kipchoge", grade: "Grade 4" },
  { name: "Samuel Achieng", grade: "Grade 4" },
  { name: "Grace Karanja", grade: "Grade 4" },
  { name: "Daniel Mbugua", grade: "Grade 4" },
  { name: "Joshua Wanjiku", grade: "Grade 4" },
  { name: "Anne Omondi", grade: "Grade 4" },
  { name: "Michael Kariuki", grade: "Grade 4" },
  // Grade 5 (7)
  { name: "Lucy Nyokabi", grade: "Grade 5" },
  { name: "Paul Cheruiyot", grade: "Grade 5" },
  { name: "Sarah Atieno", grade: "Grade 5" },
  { name: "Steven Maina", grade: "Grade 5" },
  { name: "Linda Nyambura", grade: "Grade 5" },
  { name: "Charles Onyango", grade: "Grade 5" },
  { name: "Ruth Macharia", grade: "Grade 5" },
  // Grade 6 (7)
  { name: "James Wairimu", grade: "Grade 6" },
  { name: "Anita Kiprotich", grade: "Grade 6" },
  { name: "Wilson Mukami", grade: "Grade 6" },
  { name: "Beatrice Ouma", grade: "Grade 6" },
  { name: "Catherine Nyaga", grade: "Grade 6" },
  { name: "Stephen Kamene", grade: "Grade 6" },
  { name: "Patricia Wanjira", grade: "Grade 6" },
];

/** Return the last `n` school days (weekdays) ending today, in YYYY-MM-DD. */
function lastNSchoolDays(n: number, now: Date = new Date()): string[] {
  const dates: string[] = [];
  const cursor = new Date(now);
  while (dates.length < n) {
    const day = cursor.getUTCDay(); // 0=Sun, 6=Sat
    if (day !== 0 && day !== 6) {
      dates.push(todayInTimeZone(KENYA_TZ, cursor));
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return dates.reverse();
}

/** Cheap deterministic-ish jitter so the same student doesn't get the same
 *  status every day. Mostly present, some absent, occasional late. */
function pickStatus(seed: number): "present" | "absent" | "late" {
  const r = (seed * 9301 + 49297) % 233280;
  const ratio = r / 233280;
  if (ratio < 0.85) return "present";
  if (ratio < 0.95) return "absent";
  return "late";
}

async function seed(): Promise<void> {
  await AppDataSource.initialize();
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  await AppDataSource.transaction(async (tx) => {
    // 1. Clean the demo tenant's data (CASCADE handles FKs).
    await tx.query(`DELETE FROM tenants WHERE id = $1`, [TENANT_ID]);

    // 2. Tenant
    await tx.getRepository(Tenant).save({
      id: TENANT_ID,
      schoolName: "Riverbank Academy",
      tier: "sync-enabled",
      contactName: "Mary Wanjiku",
      contactPhone: "+254700000001",
      flatFeeStatus: "active",
    });

    // 3. Users
    await tx.getRepository(User).save(
      USERS.map((u) => ({
        id: u.id,
        schoolId: TENANT_ID,
        name: u.name,
        phone: u.phone,
        role: u.role,
        passwordHash,
        isActive: true,
      })),
    );

    // 4. Students
    const studentRows = STUDENTS.map((s) => ({
      id: newId(),
      schoolId: TENANT_ID,
      name: s.name,
      grade: s.grade,
      isArchived: false,
    }));
    await tx.getRepository(Student).save(studentRows);

    // 5. Attendance — last 10 school days × all 30 students.
    // Teacher 1 (John, Grade 4) records all Grade 3/4 rows; Teacher 2 (Sarah,
    // Grade 5) records all Grade 5/6 rows.
    const schoolDays = lastNSchoolDays(10);
    const attendanceRows = [];
    let seedCounter = 1;
    for (const date of schoolDays) {
      for (const s of studentRows) {
        attendanceRows.push({
          id: newId(),
          schoolId: TENANT_ID,
          studentId: s.id,
          teacherId: s.grade === "Grade 3" || s.grade === "Grade 4" ? TEACHER1_ID : TEACHER2_ID,
          date,
          status: pickStatus(seedCounter++),
          syncedAt: new Date(),
        });
      }
    }
    await tx.getRepository(Attendance).save(attendanceRows);

    // 6. Access tokens — three telling examples for the Access Log demo
    const now = Date.now();
    const accessTokens = [
      {
        // Expired: John bought a day pass 3 days ago — expired 2 days ago.
        id: newId(),
        userId: TEACHER1_ID,
        schoolId: TENANT_ID,
        role: "teacher" as const,
        validFrom: new Date(now - 3 * 24 * 3600 * 1000),
        validUntil: new Date(now - 2 * 24 * 3600 * 1000),
        paymentRef: "MPE-DEMO-EXPIRED-001",
      },
      {
        // Active flat-fee admin token — paid via school invoice, not M-Pesa
        id: newId(),
        userId: ADMIN_ID,
        schoolId: TENANT_ID,
        role: "admin" as const,
        validFrom: new Date(now - 7 * 24 * 3600 * 1000),
        validUntil: new Date(now + 23 * 24 * 3600 * 1000),
        paymentRef: "flat-fee:2026-05",
      },
      {
        // Fresh: Sarah just bought a week pass via M-Pesa (sandbox)
        id: newId(),
        userId: TEACHER2_ID,
        schoolId: TENANT_ID,
        role: "teacher" as const,
        validFrom: new Date(now - 3600 * 1000),
        validUntil: new Date(now + (7 * 24 - 1) * 3600 * 1000),
        paymentRef: "MPE-DEMO-FRESH-001",
      },
    ];
    await tx.getRepository(AccessToken).save(accessTokens);

    return { studentRows, attendanceRows, accessTokens };
  });

  console.info("");
  console.info("┌─────────────────────────────────────────────────────────────┐");
  console.info("│  Riverbank Academy — demo seed complete                     │");
  console.info("├─────────────────────────────────────────────────────────────┤");
  console.info(`│  Tenant (X-School-ID): ${TENANT_ID}  │`);
  console.info("│  Shared password:      Password123!                         │");
  console.info("├─────────────────────────────────────────────────────────────┤");
  console.info("│  Users:                                                     │");
  for (const u of USERS) {
    const label = `${u.name} (${u.role})`.padEnd(28, " ");
    console.info(`│   ${label} ${u.phone}              │`);
  }
  console.info("├─────────────────────────────────────────────────────────────┤");
  console.info("│  30 students across Grades 3–6                              │");
  console.info("│  10 school days of attendance                               │");
  console.info("│  3 access tokens (expired, flat-fee-active, fresh M-Pesa)   │");
  console.info("└─────────────────────────────────────────────────────────────┘");
  console.info("");
  console.info("Login example:");
  console.info(
    `  curl -X POST http://localhost:3000/auth/login \\\n` +
      `    -H 'Content-Type: application/json' \\\n` +
      `    -H 'X-School-ID: ${TENANT_ID}' \\\n` +
      `    -d '{"phone":"+254700000001","password":"${PASSWORD}"}'`,
  );

  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
