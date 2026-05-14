const fs = require("fs");
const path = require("path");
const { Packer, P, H1, H2, H3, Bullet, Numbered, tableFromRows, pageBreak, blankLine, callout, buildDocument } = require("./common");

const sections = [];

// ===== 1. EXECUTIVE SUMMARY =====
sections.push([
  H1("1. Executive Summary"),
  P("The School Management System (SMS) is a local-first, multi-tenant SaaS designed for Kenyan schools — institutions where intermittent connectivity, tight cashflow, and shared devices have historically locked teachers and administrators out of conventional cloud SaaS products."),
  P("This document presents the prototype-phase blueprint: a focused, demonstrable proof of concept that proves the core business hypothesis — that schools will adopt and pay for a system that works offline-first, with sync funded by affordable per-day or per-week M-Pesa micro-payments, plus a negotiated flat fee for school administrators."),
  P("The prototype is not the final product. It is a working slice of the architecture, populated with staged data, sufficient to walk stakeholders through every business flow end-to-end: enrolment, daily attendance, sync gating by paid access, M-Pesa STK Push, and admin oversight. Decisions deferred to the MVP phase are listed explicitly so stakeholders can see the runway."),
  callout("Why prototype, not MVP",
    "An MVP must be production-ready for the first paying customer. The prototype only needs to be credible enough for stakeholders to say \"yes, build the MVP.\" That distinction shapes every scoping decision in this document."),
]);

// ===== 2. PROBLEM & OPPORTUNITY =====
sections.push([
  H1("2. Problem and Opportunity"),

  H2("2.1 The problem"),
  Bullet("**Connectivity is unreliable.** Many Kenyan schools — especially outside Tier 1 cities — operate with intermittent internet. Cloud-only SaaS becomes unusable on a bad-network day."),
  Bullet("**Affordability is binary.** Conventional SaaS monthly subscriptions assume cash predictability that schools rarely have. A teacher whose phone runs out of bundles cannot pay a monthly bill."),
  Bullet("**Data is fragmented.** Attendance lives in paper registers, fees in spreadsheets, grades in exercise books. There is no single source of truth, and reconciliation costs administrative time that schools cannot spare."),
  Bullet("**Existing systems target the wrong tier.** Most school management products in the Kenyan market target large private schools or governmental rollouts. The mid-market — fee-paying community and private schools with 100–800 students — is underserved."),

  H2("2.2 The opportunity"),
  P("A local-first architecture inverts the affordability and connectivity problems. The application works completely offline. Sync — the operation that costs server resources — is the only thing that requires payment, and it can be priced in increments that match how schools actually budget: per day, per week, or per month."),
  P("M-Pesa STK Push reduces friction to seconds: a teacher taps \"Sync,\" confirms a 10-shilling charge on their phone, and within a minute their attendance for the day is on the cloud. The same model scales to admins who pay more for longer windows, and to schools that prefer to negotiate a flat monthly invoice."),

  H2("2.3 Why now"),
  Bullet("**M-Pesa Daraja API** is mature and well-documented; integration risk is low."),
  Bullet("**GCP africa-south1 (Johannesburg)** offers sub-100ms latency to East Africa — viable for a sync-only cloud."),
  Bullet("**PowerSync** and **WatermelonDB** have made offline-first sync engines production-ready without bespoke conflict-resolution work."),
  Bullet("**Electron and Expo** allow one codebase (TypeScript + React) to target classroom desktops and teacher phones."),
]);

// ===== 3. VISION & OBJECTIVES =====
sections.push([
  H1("3. Vision and Objectives"),

  H2("3.1 Vision statement"),
  callout("Vision",
    "Every Kenyan school — regardless of size, connectivity, or budget — runs on accurate, real-time data because the cost of using software matches the cost of running the school."),

  H2("3.2 Prototype objectives"),
  P("The prototype must demonstrate, end-to-end and on a single laptop + a single phone:"),
  Numbered("A school administrator can register the school, add teachers and students, and view a dashboard — entirely offline."),
  Numbered("A teacher can sign in on a phone, take attendance for a class, and see the records persist offline."),
  Numbered("When the teacher attempts to sync, the system blocks them with a clear M-Pesa payment prompt because their access has expired (or never been purchased)."),
  Numbered("A sandbox M-Pesa STK Push completes, an access token is issued, and the same teacher can now sync — their attendance records appear on the admin desktop within seconds."),
  Numbered("An admin can see who has paid, when, and for what window, in a simple access log."),

  H2("3.3 Out of prototype scope (defer to MVP)"),
  Bullet("Real (non-sandbox) M-Pesa integration with live Safaricom credentials"),
  Bullet("GCP Cloud Run deployment — prototype runs in local Docker"),
  Bullet("Cloud SQL provisioning, automated backups, point-in-time recovery"),
  Bullet("CI/CD pipelines, monitoring, observability, alerting"),
  Bullet("Production fee management, invoicing, receipts, accounting integrations"),
  Bullet("Grading, report cards, transcripts, parent portal"),
  Bullet("Multi-region deployment, disaster recovery, RPO/RTO commitments"),
  Bullet("Onboarding wizards, self-service school sign-up, billing portal"),
  Bullet("iOS build (Android-only for prototype)"),
]);

// ===== 4. TARGET USERS =====
sections.push([
  H1("4. Target Users and Personas"),

  H2("4.1 Personas"),
  tableFromRows([
    ["Persona", "Context", "Primary device", "Pain point", "Prototype role"],
    ["Mary — School Administrator", "Owns or runs a 300-student community school in Nakuru. Manages enrolment, fees, staff.", "Office desktop (Electron)", "Drowning in spreadsheets, can't trust the numbers", "Adds students, views dashboard, monitors sync"],
    ["John — Class Teacher", "Teaches Grade 4. Carries a basic Android phone. Sometimes has bundles, sometimes not.", "Android phone (Expo)", "Paper attendance gets lost or wet; no daily visibility for parents", "Takes attendance offline, syncs when paid"],
    ["Grace — Finance Officer", "Handles fee receipts and reconciliations. Works from the admin office.", "Office desktop (Electron)", "Endless reconciliations between M-Pesa SMS and paper receipts", "Views payment log (post-prototype: full fees module)"],
    ["David — School Director", "Owns the school. Wants quarterly insight without running reports himself.", "Personal phone (Expo)", "Has to phone the admin every time he wants a number", "Read-only dashboard view (post-prototype)"],
  ], [1800, 2400, 1300, 1900, 1960]),

  H2("4.2 Stakeholders (decision makers, not end users)"),
  Bullet("**Product owner (me)** — funds, designs, builds, and ships every part of the system. The single point of accountability for product, engineering, and business operations during the prototype and early MVP phases."),
  Bullet("**Pilot school(s)** — provide real-world feedback during MVP phase; effectively the first design partners"),
  Bullet("**Safaricom Daraja team** — gate the live M-Pesa integration once go-live application is approved"),
  Bullet("**Future stakeholders (post-MVP)** — potential investors, co-founders, advisors, or hires brought in once the product has paying schools"),
]);

// ===== 5. SCOPE =====
sections.push([
  H1("5. Prototype Scope"),

  H2("5.1 In scope (must demo)"),
  Numbered("Monorepo, shared core-logic package, NestJS API, Electron app, Expo app — all skeleton implementations with the core flow working"),
  Numbered("Multi-tenant data isolation by `schoolId` enforced in every API request"),
  Numbered("JWT authentication, role-based access (teacher, admin, finance)"),
  Numbered("Local SQLite database mirroring the cloud schema, populated offline"),
  Numbered("One-way sync (push) of attendance records, gated by access token validity"),
  Numbered("M-Pesa Daraja STK Push (sandbox) with full callback handling and access token issuance"),
  Numbered("Access enforcement: 402 Payment Required when accessing sync without a valid token; prompt drives M-Pesa flow"),
  Numbered("Seeded demo data: 1 school, 1 admin, 2 teachers, 1 finance officer, 30 students across 4 grades"),

  H2("5.2 Explicitly out of scope (for prototype)"),
  Numbered("Bi-directional sync, conflict resolution, last-write-wins arbitration logic (single-writer demo flows sidestep this)"),
  Numbered("Standalone Electron mode (cloud-disconnected server) — code paths stubbed, not wired"),
  Numbered("WatermelonDB alternative — PowerSync only"),
  Numbered("Production hardening: secret rotation, key management, audit logs beyond a simple table"),
  Numbered("Performance under load — prototype demo is a single school, single device class"),
  Numbered("Accessibility audit, internationalization beyond English"),
  Numbered("Real KES money flow — sandbox numbers only"),

  H2("5.3 Demo data set"),
  tableFromRows([
    ["Entity", "Count", "Purpose"],
    ["Tenant (school)", "1", "Single demo school: Riverbank Academy, Nakuru"],
    ["Admin user", "1", "Mary Wanjiku, full admin"],
    ["Teacher user", "2", "John Otieno (Grade 4), Sarah Achieng (Grade 5)"],
    ["Finance user", "1", "Grace Mwende"],
    ["Students", "30", "Spread across Grades 3-6, with realistic Kenyan names"],
    ["Attendance records (seeded)", "~150", "Two weeks of historical data to populate the dashboard"],
    ["Access tokens (seeded)", "3", "One expired, one active (admin flat fee), one freshly bought via M-Pesa sandbox"],
  ], [2400, 1200, 5760]),
]);

// ===== 6. BUSINESS RULES =====
sections.push([
  H1("6. Business Rules"),
  P("These rules are inputs, not decisions to be made. They are fixed for the prototype and the MVP, and any deviation requires explicit stakeholder sign-off."),

  H2("6.1 Hard architectural rules"),
  Numbered("UUID v7 identifiers on every entity. No auto-increment primary keys anywhere. Rationale: sync conflict prevention across offline devices."),
  Numbered("Every entity carries a `schoolId`. There is no global data. Tenant isolation is enforced at every API boundary."),
  Numbered("`packages/core-logic` is framework-agnostic. No NestJS, React, Expo, or Node-only imports. It is pure TypeScript + Zod."),
  Numbered("The application is offline-first. Every user-facing feature except sync itself must work with no internet."),
  Numbered("Electron has a standalone mode in which it runs as a local server, with no cloud dependency. (Code paths stubbed for prototype, wired for MVP.)"),

  H2("6.2 Pricing rules"),
  tableFromRows([
    ["Pass", "Teacher (KES)", "Admin (KES)", "Window"],
    ["Day", "10", "50", "24 hours from purchase"],
    ["Week", "50", "200", "7 days from purchase"],
    ["Month", "150", "600", "30 days from purchase"],
  ], [2000, 2400, 2400, 2560]),
  Bullet("Offline use is free, always. Sync is the only paid action."),
  Bullet("School admin flat fee is **negotiated per school** and covers 1–2 admin devices. Invoiced monthly to the school."),
  Bullet("Access tokens are time-bound JWTs issued **only after** M-Pesa payment confirmation. They are not refreshable; they expire and the user must re-purchase."),

  H2("6.3 Access enforcement rules"),
  Bullet("**Hard enforcement** from day one. Expired access returns HTTP 402 Payment Required from the API."),
  Bullet("The 402 response body carries `{ code: \"ACCESS_EXPIRED\", upgradeUrl: \"/pay\" }` so the client can render the M-Pesa prompt directly."),
  Bullet("Admin flat-fee users skip the 402 check as long as the school's flat-fee status is `active`."),
  Bullet("Devices are registered on first sync. The system tracks `deviceId` per user; transfer between devices is allowed but logged."),
]);

// ===== 7. ARCHITECTURE OVERVIEW =====
sections.push([
  H1("7. Architecture Overview"),

  H2("7.1 Component diagram (text)"),
  P("The system has three tiers: clients (Electron desktop and Expo mobile), the NestJS API, and the data plane (PostgreSQL + PowerSync). The core-logic package is shared across the clients and the API to guarantee identical business rules everywhere."),
  blankLine(),
  callout("Data flow at a glance",
    "Client SQLite ← → PowerSync ← → NestJS API ← → PostgreSQL. The client never talks to PostgreSQL directly. Every API call carries `X-School-ID` and a JWT. Sync routes additionally require a valid access token (or admin flat-fee status)."),

  H2("7.2 Logical architecture"),
  tableFromRows([
    ["Layer", "Technology", "Responsibility"],
    ["Desktop client", "React + Electron", "Office-facing UI; local SQLite; admin dashboard; standalone-mode capable"],
    ["Mobile client", "React Native (Expo)", "Teacher-facing UI; local SQLite; lightweight, optimised for low-end Android"],
    ["Shared logic", "TypeScript + Zod (core-logic)", "Schemas, UUID v7, pricing, access validation, term-from-date — used by both clients and the API"],
    ["Sync engine", "PowerSync", "Two-way replication between client SQLite and cloud PostgreSQL, filtered by schoolId"],
    ["API", "NestJS", "Auth, tenant guard, access guard, M-Pesa integration, business endpoints"],
    ["Source of truth", "PostgreSQL (Cloud SQL)", "Authoritative data, RLS per schoolId, regular backups"],
    ["Payments", "Safaricom Daraja API", "STK Push initiation + callback; access token issuance triggered by callback"],
  ], [2000, 2400, 4960]),

  H2("7.3 Key cross-cutting concerns"),
  Bullet("**Tenant isolation**: every request carries `X-School-ID`; a guard validates it before any business logic runs; PostgreSQL Row Level Security adds defence in depth."),
  Bullet("**Idempotency**: M-Pesa callbacks are inherently retried by Safaricom. The payments service uses `MpesaReceiptNumber` as an idempotency key."),
  Bullet("**Conflict prevention** (not resolution): UUID v7 on the client means no ID collisions on the server even when offline-created. The prototype avoids true conflict scenarios; the MVP will add last-write-wins per entity."),
  Bullet("**Configuration**: all environment-specific values come from environment variables. No secrets are baked into clients."),
]);

// ===== 8. TECHNOLOGY STACK =====
sections.push([
  H1("8. Technology Stack"),
  tableFromRows([
    ["Layer", "Choice", "Version", "Rationale"],
    ["Monorepo", "Turborepo + pnpm", "Latest LTS", "Fast incremental builds; pnpm for disk-efficient workspace deps"],
    ["Language", "TypeScript (strict)", "5.x", "Type safety end-to-end; one language for client, server, shared logic"],
    ["Backend framework", "NestJS", "10.x", "Opinionated module structure; DI; mature guard/interceptor model"],
    ["ORM", "TypeORM", "0.3.x", "First-class migrations; entity decorators align with NestJS"],
    ["Database", "PostgreSQL", "16", "RLS, JSONB, mature, GCP Cloud SQL ready"],
    ["Client DB", "SQLite", "3.x", "Embedded, file-based, supported by both Electron and Expo"],
    ["Sync", "PowerSync", "Latest", "Managed service; sync rules in YAML; supports SQLite ↔ PostgreSQL"],
    ["Validation", "Zod", "3.x", "Used in core-logic — types and runtime validation in one definition"],
    ["IDs", "UUID v7", "via `uuid` v10+", "Time-sortable, sync-safe; first-class support in modern PostgreSQL"],
    ["Auth", "JWT + bcrypt", "—", "Stateless API; passwords hashed; access tokens are short-lived JWTs"],
    ["Desktop shell", "Electron + Vite + React", "Latest", "Chromium runtime; rich UI; standalone-mode capable"],
    ["Mobile shell", "Expo (managed)", "SDK 51+", "OTA updates; one codebase for Android (iOS post-prototype)"],
    ["Payments", "Safaricom Daraja", "Sandbox → Live", "Industry standard; STK Push UX is already familiar to users"],
    ["Cloud", "GCP (Cloud Run, Cloud SQL)", "africa-south1", "Lowest-latency region for East Africa; managed services reduce ops burden"],
    ["Container", "Docker", "—", "Local dev parity with Cloud Run"],
    ["Testing", "Jest + Supertest", "Latest", "Unit + integration; Detox/Playwright deferred to MVP"],
  ], [1800, 2100, 1300, 4160]),
]);

// ===== 9. DATA MODEL =====
sections.push([
  H1("9. Data Model (Prototype)"),
  P("Six core entities. Every entity has `id` (UUID v7), `schoolId` (UUID v7), and `createdAt` (timestamp with timezone). Only the entity-specific fields are listed below."),
  tableFromRows([
    ["Entity", "Key fields", "Notes"],
    ["tenants", "id, schoolName, tier, contactName, contactPhone, flatFeeStatus, createdAt", "One row per school. `tier` = offline | sync-enabled."],
    ["users", "id, schoolId, name, phone, role, passwordHash, deviceId, createdAt", "`role` = teacher | admin | finance. `phone` is the M-Pesa number."],
    ["access_tokens", "id, userId, schoolId, role, validFrom, validUntil, paymentRef, createdAt", "Time-bound. `paymentRef` = MpesaReceiptNumber for audit."],
    ["students", "id, schoolId, name, grade, dateOfBirth, guardianPhone, createdAt", "Demo set: 30 students, Grades 3–6."],
    ["attendance", "id, schoolId, studentId, teacherId, date, status, note, syncedAt, createdAt", "`status` = present | absent | late. `syncedAt` null until sync."],
    ["payments", "id, schoolId, userId, amountKES, pass, mpesaReceipt, status, createdAt", "Records every M-Pesa attempt — pending, success, failed."],
  ], [1800, 4400, 3160]),

  H2("9.1 Entity relationship summary"),
  Bullet("`tenants` 1 → N `users`, `students`, `attendance`, `access_tokens`, `payments`"),
  Bullet("`users` 1 → N `access_tokens`, `attendance` (as teacher), `payments`"),
  Bullet("`students` 1 → N `attendance`"),
  Bullet("`payments` 1 → 0..1 `access_tokens` (issued on success)"),

  H2("9.2 Indexing strategy"),
  Bullet("`users(school_id)`, `students(school_id)` — tenant scope lookups"),
  Bullet("`access_tokens(user_id, valid_until DESC)` — fast lookup of \"is this user currently allowed to sync?\""),
  Bullet("`attendance(school_id, date)` — daily roll-up queries"),
  Bullet("`payments(mpesa_receipt)` UNIQUE — idempotency on Daraja callbacks"),
]);

// ===== 10. SECURITY =====
sections.push([
  H1("10. Security and Compliance"),
  H2("10.1 Authentication"),
  Bullet("Passwords hashed with bcrypt (cost 12)"),
  Bullet("JWT access tokens, short-lived (15 minutes); refresh tokens (7 days) stored httpOnly on desktop, secure storage on mobile"),
  Bullet("Per-device login: `deviceId` recorded on first sync; subsequent logins from new devices require admin re-approval (MVP — prototype logs only)"),

  H2("10.2 Tenant isolation"),
  Bullet("API layer: `TenantGuard` on every controller; rejects missing or invalid `X-School-ID`"),
  Bullet("Database layer: PostgreSQL Row Level Security policies filter by `school_id`"),
  Bullet("Sync layer: PowerSync sync rules filter every replication stream by `schoolId`"),

  H2("10.3 Payment security"),
  Bullet("Daraja credentials live only in API environment variables, never in clients"),
  Bullet("Callback URL is HTTPS, validated against Daraja IP ranges (MVP — prototype accepts sandbox calls)"),
  Bullet("`MpesaReceiptNumber` is treated as an idempotency key — duplicate callbacks cannot issue duplicate tokens"),

  H2("10.4 Data protection"),
  Bullet("In transit: TLS 1.2+ everywhere"),
  Bullet("At rest: Cloud SQL encryption by default; SQLite database files are inside the OS user's profile directory and inherit OS-level permissions"),
  Bullet("PII minimisation: only the fields needed for school operations are collected; no national ID numbers in the prototype"),

  H2("10.5 Compliance posture"),
  P("Kenya's Data Protection Act (2019) applies. The prototype documents what data is collected and why; full DPIA (data protection impact assessment) is an MVP deliverable. GCP africa-south1 keeps data within the African continent."),
]);

// ===== 11. CLOUD INFRASTRUCTURE =====
sections.push([
  H1("11. Cloud and Deployment"),

  H2("11.1 Prototype environment"),
  P("Everything runs locally. A `docker-compose.yml` at the repo root brings up PostgreSQL, the NestJS API, and pgAdmin. Electron and Expo clients connect to `http://localhost:3000`. Daraja sandbox is reached over the internet (the developer machine needs an outbound connection for the live demo)."),

  H2("11.2 MVP target environment (post-prototype)"),
  tableFromRows([
    ["Component", "GCP service", "Region", "Why"],
    ["NestJS API", "Cloud Run", "africa-south1", "Pay-per-request; scales to zero; matches prototype Docker image"],
    ["PostgreSQL", "Cloud SQL (PostgreSQL 16)", "africa-south1", "Managed; automated backups; PITR; HA optional"],
    ["PowerSync", "PowerSync Cloud", "africa-south1 if available, else us-east", "Managed sync; colocated where possible"],
    ["Secrets", "Secret Manager", "global", "Daraja keys, JWT signing key"],
    ["Container images", "Artifact Registry", "africa-south1", "Private registry, scoped IAM"],
    ["CI/CD", "GitHub Actions → Cloud Run (Workload Identity Federation)", "—", "No long-lived service account keys"],
    ["Observability (MVP)", "Cloud Logging + Error Reporting", "africa-south1", "Built-in; sufficient for first-customer scale"],
  ], [1900, 2700, 1700, 3060]),

  H2("11.3 Deployment topology"),
  Bullet("Single Cloud Run service, single Cloud SQL instance, single PowerSync project for the MVP (multi-region is a Phase 4 concern)"),
  Bullet("Zero-downtime deploys via Cloud Run revisions"),
  Bullet("Migrations run as a Cloud Run Job on deploy, gated on a successful image build"),
]);

// ===== 12. PROTOTYPE DELIVERABLES =====
sections.push([
  H1("12. Prototype Deliverables"),

  H2("12.1 Code"),
  Bullet("Monorepo with working Turborepo + pnpm setup"),
  Bullet("`packages/core-logic` published as a workspace package with Zod schemas, UUID v7 utilities, pricing function, access-validity function"),
  Bullet("`apps/api` — NestJS with `TenantGuard`, `AccessGuard`, JWT auth, M-Pesa payments stub (sandbox-wired), Postgres migrations"),
  Bullet("`apps/desktop` — Electron + React with admin dashboard, login, student list, attendance review screen"),
  Bullet("`apps/mobile` — Expo Android build with teacher login, class roster, attendance capture, sync button, M-Pesa prompt"),
  Bullet("`docker-compose.yml` for local Postgres + API + pgAdmin"),
  Bullet("Seed script that populates the demo data set"),

  H2("12.2 Documents"),
  Bullet("This **Project Blueprint** (executive-facing)"),
  Bullet("**SRS** — Software Requirements Specification (engineering-facing)"),
  Bullet("**Product Backlog** — epics, user stories, acceptance criteria, prioritised"),
  Bullet("`README.md` — how to run the prototype locally"),
  Bullet("`DEMO_SCRIPT.md` — step-by-step walkthrough for stakeholder demos"),

  H2("12.3 Demonstration"),
  Bullet("A 20–30 minute live demo on a laptop + Android phone covering every flow in Section 13"),
  Bullet("A short Loom (or equivalent) screen recording as a leave-behind"),

  H2("12.4 What stakeholders walk away with"),
  callout("The handover",
    "A working prototype on a laptop they can drive themselves, three documents that describe what is built and what comes next, and a clear cost and timeline estimate for the MVP phase."),
]);

// ===== 13. DEMO SCENARIOS =====
sections.push([
  H1("13. Stakeholder Demo Scenarios"),
  P("Each scenario is a self-contained story. The demo lead should be able to run any one without depending on the others (data is seeded fresh per run)."),

  H2("Scenario A — Offline-first daily flow"),
  Numbered("Open the Expo app on the demo Android phone with the wifi off."),
  Numbered("Log in as John (teacher). Show the class roster loaded from local SQLite."),
  Numbered("Mark attendance for Grade 4 — 5 present, 1 absent, 1 late."),
  Numbered("Close and reopen the app. Records persist."),
  Numbered("Talking point: no internet was needed for any of this."),

  H2("Scenario B — Sync-gated by payment"),
  Numbered("Still logged in as John, turn wifi on and tap \"Sync\"."),
  Numbered("API returns 402; app shows \"Your sync access has expired. Pay KES 10 for a day pass?\""),
  Numbered("Tap \"Pay with M-Pesa.\" An STK push lands on the demo phone (sandbox)."),
  Numbered("Enter the sandbox PIN. Within a few seconds, the access:granted WebSocket fires."),
  Numbered("Sync runs automatically. Attendance records appear in the admin desktop dashboard."),
  Numbered("Talking point: this is the unit of revenue."),

  H2("Scenario C — Admin dashboard and access log"),
  Numbered("Switch to the Electron desktop. Log in as Mary (admin)."),
  Numbered("Show the dashboard: total students, today's attendance summary, recent syncs."),
  Numbered("Open the Access Log: see John's KES 10 payment from Scenario B, the access window, and the M-Pesa receipt number."),
  Numbered("Talking point: every shilling is traceable. Reconciliation is built in."),

  H2("Scenario D — Admin flat fee, no per-sync gate"),
  Numbered("Mary attempts to sync (she's on the school's flat-fee plan)."),
  Numbered("Sync completes without an M-Pesa prompt."),
  Numbered("Open the Access Log: Mary's row shows `flat-fee` instead of an M-Pesa receipt."),
  Numbered("Talking point: schools that prefer monthly invoicing have an unblocked admin experience."),

  H2("Scenario E — Multi-tenancy proof (optional, technical audience)"),
  Numbered("Open a database client (pgAdmin) and inspect the `users` table."),
  Numbered("Show that every row has a `school_id`."),
  Numbered("Make an API call against the API with a different `X-School-ID` value: it returns an empty result, not an error — tenant isolation is enforced."),
  Numbered("Talking point: a second school can be onboarded without touching the codebase."),
]);

// ===== 14. SUCCESS CRITERIA =====
sections.push([
  H1("14. Prototype Success Criteria"),
  P("Stakeholders agree the prototype has succeeded if **all** of the following are demonstrably true on a single live session:"),
  Numbered("All five demo scenarios above run end-to-end without manual intervention or workarounds."),
  Numbered("The M-Pesa sandbox round-trip (initiate → callback → token issued → sync unblocked) completes in under 60 seconds."),
  Numbered("Closing and reopening the mobile app preserves all offline-captured data."),
  Numbered("A second school's records cannot be retrieved by an API request that supplies the wrong `X-School-ID`."),
  Numbered("The Access Log shows a complete, accurate audit trail of every payment and resulting sync window."),
  Numbered("Stakeholders can articulate, in their own words, why the system works for a school that has unreliable internet and tight cashflow."),
]);

// ===== 15. RISKS =====
sections.push([
  H1("15. Risks and Mitigations"),
  tableFromRows([
    ["Risk", "Likelihood", "Impact", "Mitigation"],
    ["M-Pesa Daraja sandbox is flaky during the demo", "Medium", "High (kills momentum)", "Pre-record a backup video of the M-Pesa flow; have a fallback \"simulate payment\" admin button for the live demo"],
    ["PowerSync free tier limits hit during prototype", "Low", "Medium", "Use seed data within free-tier quota; document upgrade path"],
    ["Stakeholders push for features outside prototype scope", "High", "Medium", "This blueprint and the SRS explicitly list out-of-scope items — reference them in the conversation"],
    ["Daraja go-live requires production credentials we don't have yet", "High", "Low for prototype, High for MVP", "Sandbox is sufficient for prototype; start the live-Daraja application process in parallel with MVP build"],
    ["Schools resist registered-device tracking", "Medium", "Medium", "Frame it as security, not surveillance; allow device transfers via admin approval"],
    ["Connectivity at the demo venue fails", "Medium", "High", "The whole point of the system is to work without internet — turn off wifi and demo offline first; the M-Pesa scenario is the only one that needs internet"],
    ["Hidden complexity in WatermelonDB if we have to swap", "Low (we chose PowerSync)", "High if it happens", "Keep the sync interface in core-logic abstract enough that the engine is swappable"],
    ["Performance on low-end Android phones is poor", "Medium", "High (real users)", "Profile on a baseline device (e.g., Tecno Spark) before MVP build; budget for native modules if needed"],
  ], [2400, 1300, 1500, 4160]),
]);

// ===== 16. TIMELINE =====
sections.push([
  H1("16. Timeline"),
  P("Working durations assume the product owner is the sole full-time builder. There is no separate engineering team, consulting partner, or co-founder; every hour on this project comes from one person. Add buffer if other commitments compete for that capacity."),

  H2("16.1 Prototype phase (4–6 weeks)"),
  tableFromRows([
    ["Week", "Focus", "Outputs"],
    ["1", "Monorepo, core-logic, NestJS skeleton, Postgres migrations", "Code compiles, tests pass, schemas validated"],
    ["2", "Auth, tenant guard, access guard, M-Pesa stub, callback handling", "API integration tests pass; sandbox STK Push round-trip works"],
    ["3", "Electron app skeleton: login, dashboard, student list, access log", "Desktop demo flow A and C runnable"],
    ["4", "Expo app skeleton: login, attendance, sync, M-Pesa prompt", "Mobile demo flow A and B runnable"],
    ["5", "Seed data, demo polish, demo script, internal dry-run", "Full demo runs end-to-end"],
    ["6 (buffer)", "Fixes from dry-run, leave-behind recording, stakeholder demo", "Stakeholder demo delivered"],
  ], [900, 3600, 4860]),

  H2("16.2 Post-prototype (MVP) phase (8–12 weeks)"),
  Bullet("Bi-directional sync with conflict resolution"),
  Bullet("Live Daraja credentials and production-grade callback verification"),
  Bullet("GCP Cloud Run + Cloud SQL deployment with CI/CD"),
  Bullet("Standalone Electron mode (cloud-disconnected)"),
  Bullet("First pilot school onboarded"),
  Bullet("Monitoring, logging, basic alerting"),
  Bullet("Fees module, invoice generation, M-Pesa for fees (separate flow from access tokens)"),

  H2("16.3 Roadmap beyond MVP"),
  Bullet("Grades and report cards"),
  Bullet("Parent portal (read-only)"),
  Bullet("iOS build"),
  Bullet("Multi-region / disaster recovery"),
  Bullet("Bulk import from spreadsheets"),
  Bullet("Integrations: KCSE/KCPE registration, NEMIS"),
]);

// ===== 17. TEAM =====
sections.push([
  H1("17. Team and Roles"),
  P("The project is a one-person build. Every role below is owned by the same person — the product owner. The table doubles as a hiring or outsourcing checklist: when budget or scale calls for it, these are the seams where help comes in."),
  tableFromRows([
    ["Role", "Owner today", "When to consider outsourcing or hiring"],
    ["Product owner / manager", "Me", "Stays in-house indefinitely"],
    ["Engineering manager", "Me", "Stays in-house indefinitely"],
    ["Senior engineer (build)", "Me", "Consider a second engineer after first 2–3 paying schools"],
    ["Business operations", "Me", "Outsource bookkeeping post-MVP; ops hire after revenue stabilises"],
    ["Pilot-school liaison", "Me", "Stays in-house during prototype and MVP"],
    ["Designer (UI/UX)", "Me (with templates)", "Hire part-time before MVP polish phase"],
    ["DevOps", "Me", "Outsource Cloud Run / Cloud SQL setup for MVP; manage internally after"],
    ["Legal advisor", "Outsource as needed", "Use a Kenyan tech-startup lawyer for DPA, ToS, pilot MoU review"],
  ], [2200, 2200, 4960]),
]);

// ===== 18. OPEN DECISIONS =====
sections.push([
  H1("18. Open Decisions"),
  P("These items are deferred to specific points in the timeline. They are tracked here so they do not become silent blockers."),
  tableFromRows([
    ["Decision", "When it must be made", "Default if no input"],
    ["School flat-fee pricing band", "Before first pilot", "KES 3,000 / month for ≤ 200 students"],
    ["Final sync library: PowerSync vs WatermelonDB", "Start of MVP", "PowerSync (per Section 4 of handoff)"],
    ["Production Daraja paybill / shortcode setup", "MVP week 1", "Use sandbox until live credentials arrive"],
    ["Pilot school selection", "Start of MVP", "Project sponsor selects 1–2 schools"],
    ["Multi-device admin policy (1 vs 2 vs N devices for flat fee)", "Before invoicing first school", "Flat fee covers 2 admin devices; additional at +KES 1,000/device/month"],
    ["Data residency requirement (must data stay in Kenya?)", "Before first pilot signs MoU", "GCP africa-south1 (Johannesburg) — closest African region"],
    ["Brand and product name", "Before public-facing launch", "\"SMS\" placeholder; rebrand at MVP launch"],
  ], [3000, 2700, 3660]),
]);

// ===== 19. APPENDIX =====
sections.push([
  H1("Appendix A — Glossary"),
  tableFromRows([
    ["Term", "Definition"],
    ["Local-first", "Architecture in which the local device is the primary data store; the cloud is for sync and backup only"],
    ["Multi-tenant", "Architecture in which a single deployed application serves multiple isolated customer organisations (schools)"],
    ["UUID v7", "Time-ordered universally unique identifier; sortable by creation time, safe to generate offline"],
    ["STK Push", "Safaricom Daraja \"SIM Tool Kit\" Push — sends a payment prompt to the user's phone"],
    ["Daraja", "Safaricom's developer API platform for M-Pesa"],
    ["RLS", "Row-Level Security — PostgreSQL feature that filters rows visible to a query based on context"],
    ["JWT", "JSON Web Token — signed, stateless authentication token"],
    ["Access token (in SMS)", "A time-bound JWT issued after M-Pesa payment, granting sync access for a defined window"],
    ["Sync window", "The time period during which a user's access token is valid (day / week / month)"],
    ["Pass", "A purchasable access window: day, week, or month"],
    ["Flat fee", "School-level subscription that covers admin devices without per-day micro-payments"],
    ["SRS", "Software Requirements Specification — the formal requirements document"],
    ["PowerSync", "Managed offline-first sync service: replicates between client SQLite and cloud PostgreSQL"],
    ["NEMIS", "National Education Management Information System (Kenya MoE)"],
  ], [2500, 6860]),
  H1("Appendix B — Document control"),
  tableFromRows([
    ["Version", "Date", "Author", "Change"],
    ["0.1", new Date().toISOString().slice(0, 10), "Product owner", "Initial draft for stakeholder review"],
  ], [1500, 2000, 2800, 3060]),
]);

const doc = buildDocument({
  title: "Project Blueprint",
  subtitle: "Prototype Phase — for stakeholder review",
  sections,
});

const outPath = path.join(__dirname, "..", "docs", "01-Project-Blueprint.docx");
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outPath, buf);
  console.log("Wrote", outPath, "(", buf.length, "bytes )");
});
