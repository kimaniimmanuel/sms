const fs = require("fs");
const path = require("path");
const { Packer, P, H1, H2, H3, Bullet, Numbered, tableFromRows, pageBreak, blankLine, callout, buildDocument } = require("./common");

const sections = [];

// Helper to render a user story
function story({ id, title, persona, want, why, priority, points, phase, depends, accept, frs }) {
  const blocks = [
    H3(`${id} — ${title}`),
    tableFromRows([
      ["Field", "Value"],
      ["Priority", priority],
      ["Phase", phase],
      ["Story points", String(points)],
      ["Depends on", depends || "—"],
      ["Linked SRS", frs || "—"],
    ], [2000, 7360]),
    P(`As a ${persona},`, { italics: true }),
    P(`I want to ${want},`, { italics: true }),
    P(`so that ${why}.`, { italics: true }),
    P("Acceptance criteria:", { bold: true }),
  ];
  for (const a of accept) blocks.push(Bullet(a));
  blocks.push(blankLine());
  return blocks;
}

// ===== INTRO =====
sections.push([
  H1("1. Backlog Overview"),
  P("This product backlog is the sprint-ready breakdown of the SRS. Every user story traces back to one or more SRS functional requirements (FR-*) so coverage is auditable. Stories are grouped into epics and tagged with priority and phase."),

  H2("1.1 Priority and phase tags"),
  tableFromRows([
    ["Tag", "Meaning"],
    ["P0 · Prototype", "Must ship in the prototype demo"],
    ["P1 · MVP", "Required for first paying school"],
    ["P2 · Roadmap", "Future iteration; not estimated in detail"],
  ], [3000, 6360]),

  H2("1.2 Estimation scale"),
  Bullet("**1 point** — trivial; under a day"),
  Bullet("**2 points** — small; 1–2 days"),
  Bullet("**3 points** — medium; 3–5 days"),
  Bullet("**5 points** — substantial; about a week"),
  Bullet("**8 points** — large; needs decomposition before sprint start"),
  Bullet("**13 points** — too big; must be split"),

  H2("1.3 Definition of Ready"),
  Bullet("Story has a single clear actor and outcome"),
  Bullet("Acceptance criteria are testable, not aspirational"),
  Bullet("Estimated and prioritised"),
  Bullet("Dependencies identified"),
  Bullet("Linked SRS requirement(s) referenced"),

  H2("1.4 Definition of Done"),
  Bullet("Code merged to `main`"),
  Bullet("Unit tests written and passing"),
  Bullet("Integration tests written for any new API endpoint"),
  Bullet("Acceptance criteria demonstrably met (manual smoke check minimum)"),
  Bullet("No new TypeScript or lint errors introduced"),
  Bullet("Documented in `README.md` or in `core-logic` JSDoc where relevant"),
]);

// ===== EPIC SUMMARY =====
sections.push([
  H1("2. Epic Summary"),
  tableFromRows([
    ["Epic", "Title", "Phase focus", "Story count", "Points (P0)"],
    ["E1", "Foundations and Tooling", "Prototype", "6", "13"],
    ["E2", "Core-Logic Shared Package", "Prototype", "7", "15"],
    ["E3", "Database and Migrations", "Prototype", "5", "10"],
    ["E4", "Authentication and Sessions", "Prototype", "6", "13"],
    ["E5", "Multi-Tenant API Layer", "Prototype", "5", "11"],
    ["E6", "School and User Management", "Prototype + MVP", "6", "10"],
    ["E7", "Student Records", "Prototype + MVP", "5", "9"],
    ["E8", "Attendance", "Prototype + MVP", "6", "13"],
    ["E9", "M-Pesa Daraja Integration", "Prototype", "6", "16"],
    ["E10", "Access Tokens and Enforcement", "Prototype", "5", "11"],
    ["E11", "Sync (Push)", "Prototype", "5", "13"],
    ["E12", "Sync (Pull + Conflict)", "MVP", "4", "0 P0"],
    ["E13", "Desktop App (Electron + React)", "Prototype", "8", "18"],
    ["E14", "Mobile App (Expo Android)", "Prototype", "8", "18"],
    ["E15", "Demo Data and Seed", "Prototype", "3", "5"],
    ["E16", "Demo Polish and Scripts", "Prototype", "4", "6"],
    ["E17", "DevOps and Cloud Deployment", "MVP", "5", "0 P0"],
    ["E18", "Reporting and Roadmap", "Post-MVP", "Various", "—"],
  ], [800, 3500, 1700, 1500, 1860]),
  callout("Prototype effort estimate",
    "Roughly 180 points of P0 work across the prototype epics. At a sustained velocity of ~30 points per week for one senior engineer, that lands at 6 weeks — matching the timeline in the Blueprint."),
]);

// ===== EPIC 1 — FOUNDATIONS =====
sections.push([
  H1("3. Epic E1 — Foundations and Tooling"),
  P("Lay down the monorepo, lint, type, and build pipelines so every later epic stops fighting the toolchain."),
  ...story({
    id: "US-E1-001", title: "Initialise the Turborepo monorepo", persona: "developer",
    want: "a working Turborepo + pnpm workspace skeleton with apps/ and packages/ slots",
    why: "downstream epics can scaffold their packages without re-discussing layout",
    priority: "P0 · Prototype", points: 2, phase: "Week 1",
    depends: "—",
    frs: "Constraint",
    accept: [
      "`pnpm install` succeeds from a fresh clone",
      "`pnpm turbo run build` finds all packages and runs in topological order",
      "`pnpm-workspace.yaml` includes both `apps/*` and `packages/*`",
      "`turbo.json` pipeline declares `core-logic#build` before any app build",
    ],
  }),
  ...story({
    id: "US-E1-002", title: "Add base TypeScript config", persona: "developer",
    want: "a shared `tsconfig.base.json` with strict mode and path aliases",
    why: "every package inherits the same compiler rules without duplication",
    priority: "P0 · Prototype", points: 1, phase: "Week 1",
    depends: "US-E1-001",
    frs: "Constraint",
    accept: [
      "`strict: true` and `noUncheckedIndexedAccess: true` enabled",
      "Path alias `@sms/core-logic` resolves to `packages/core-logic/src/index.ts`",
      "Every app `tsconfig.json` extends the base",
    ],
  }),
  ...story({
    id: "US-E1-003", title: "Add lint and format config", persona: "developer",
    want: "ESLint + Prettier wired into the monorepo with a single `pnpm lint` command",
    why: "code style stops being a debate",
    priority: "P0 · Prototype", points: 2, phase: "Week 1",
    depends: "US-E1-001",
    accept: [
      "ESLint config extends `eslint:recommended`, `@typescript-eslint/recommended`, and React rules in client packages",
      "Prettier config consistent across packages",
      "`pnpm lint` exits clean on a fresh scaffold",
      "Pre-commit hook (husky or simple-git-hooks) runs `lint-staged`",
    ],
  }),
  ...story({
    id: "US-E1-004", title: "Add Jest base config", persona: "developer",
    want: "Jest configured for `core-logic` and `apps/api` with one root command",
    why: "tests run before they are written, not after",
    priority: "P0 · Prototype", points: 2, phase: "Week 1",
    depends: "US-E1-002",
    accept: [
      "`pnpm test` runs all packages",
      "Coverage report generated under `coverage/`",
      "Sample test passes in `core-logic`",
    ],
  }),
  ...story({
    id: "US-E1-005", title: "Add Docker Compose for local Postgres + pgAdmin", persona: "developer",
    want: "a `docker-compose.yml` that spins up Postgres 16, pgAdmin, and reserves a slot for the API container",
    why: "every developer gets the same local DB without manual setup",
    priority: "P0 · Prototype", points: 2, phase: "Week 1",
    depends: "US-E1-001",
    accept: [
      "`docker compose up postgres pgadmin` brings both up cleanly",
      "Postgres data volume is named and persistent",
      "pgAdmin pre-registers the local Postgres connection",
      "Healthcheck defined on Postgres service",
    ],
  }),
  ...story({
    id: "US-E1-006", title: "Configure root package scripts", persona: "developer",
    want: "convenience scripts: `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm typecheck`",
    why: "a new contributor can be productive in five minutes",
    priority: "P0 · Prototype", points: 1, phase: "Week 1",
    depends: "US-E1-001, US-E1-003, US-E1-004",
    accept: [
      "Each script runs via Turbo with `--filter` where appropriate",
      "Documented in root README",
    ],
  }),
]);

// ===== EPIC 2 — CORE LOGIC =====
sections.push([
  H1("4. Epic E2 — Core-Logic Shared Package"),
  P("Schemas, IDs, pricing, validity. The package is the single source of truth for business rules and ships to both the API and the clients."),
  ...story({
    id: "US-E2-001", title: "Set up @sms/core-logic package skeleton", persona: "developer",
    want: "a `packages/core-logic` workspace package that builds to ESM and exports types",
    why: "downstream packages can import `@sms/core-logic` immediately",
    priority: "P0 · Prototype", points: 1, phase: "Week 1",
    depends: "US-E1-002",
    accept: [
      "`packages/core-logic/package.json` named `@sms/core-logic`",
      "Builds to `dist/` via tsc",
      "`index.ts` re-exports submodules",
    ],
  }),
  ...story({
    id: "US-E2-002", title: "Implement UUID v7 newId() helper", persona: "developer",
    want: "a `newId(): string` function returning RFC 9562 UUID v7 values",
    why: "every entity gets time-sortable, sync-safe IDs without auto-increment",
    priority: "P0 · Prototype", points: 1, phase: "Week 1",
    depends: "US-E2-001",
    frs: "Constraint",
    accept: [
      "Uses `uuid` v10+ `v7()` under the hood",
      "Returns lowercase canonical string",
      "Unit test: 10,000 calls produce strictly increasing values when compared as strings (within same ms tolerance)",
    ],
  }),
  ...story({
    id: "US-E2-003", title: "Implement termFromDate() helper", persona: "developer",
    want: "a function returning `term1 | term2 | term3` based on Kenyan school calendar dates",
    why: "term-based reporting (P1) needs a single trusted definition",
    priority: "P0 · Prototype", points: 1, phase: "Week 1",
    depends: "US-E2-001",
    accept: [
      "Returns `term1` for Jan–Apr, `term2` for May–Aug, `term3` for Sep–Dec (placeholder; ranges editable)",
      "Unit tests cover boundary days",
    ],
  }),
  ...story({
    id: "US-E2-004", title: "Define Zod schemas (Tenant, User, Student, AccessToken)", persona: "developer",
    want: "strict Zod schemas with inferred types exported alongside",
    why: "the API and the clients validate identically with the same definition",
    priority: "P0 · Prototype", points: 3, phase: "Week 1",
    depends: "US-E2-002",
    frs: "FR-TENANT-004, FR-SCHOOL-001, FR-STU-001, FR-PAY-004",
    accept: [
      "All schemas use `z.object().strict()`",
      "Every schema includes `schoolId: z.string().uuid()`",
      "Inferred types are re-exported via `types/index.ts`",
      "Unit tests: valid examples parse; invalid examples fail with predictable error paths",
    ],
  }),
  ...story({
    id: "US-E2-005", title: "Implement priceKES(role, pass) pricing function", persona: "developer",
    want: "a deterministic function returning the KES amount for (role, pass)",
    why: "pricing changes only in one place across the codebase",
    priority: "P0 · Prototype", points: 2, phase: "Week 1",
    depends: "US-E2-001",
    frs: "Pricing rules",
    accept: [
      "teacher: day=10, week=50, month=150; admin: day=50, week=200, month=600",
      "Unknown combination throws with a clear error",
      "Unit tests cover the full matrix",
    ],
  }),
  ...story({
    id: "US-E2-006", title: "Implement accessDurationHours(pass) helper", persona: "developer",
    want: "a function returning duration in hours for day/week/month",
    why: "the access-token service uses one source of truth for validity windows",
    priority: "P0 · Prototype", points: 1, phase: "Week 1",
    depends: "US-E2-001",
    accept: [
      "day=24, week=168, month=720",
      "Unit-tested with all three values",
    ],
  }),
  ...story({
    id: "US-E2-007", title: "Implement isAccessValid(token) rule", persona: "developer",
    want: "a function that returns true iff token.validUntil > now",
    why: "every guard, every UI badge uses the same source of truth",
    priority: "P0 · Prototype", points: 2, phase: "Week 1",
    depends: "US-E2-004, US-E2-006",
    frs: "FR-ACC-001",
    accept: [
      "Accepts an AccessToken object validated by AccessTokenSchema",
      "Edge case: validUntil = now returns false (strict greater-than)",
      "Edge case: missing fields throws via Zod, not silently false",
      "Unit-tested with frozen Date.now",
    ],
  }),
  ...story({
    id: "US-E2-008", title: "Reach ≥ 80% line coverage in core-logic", persona: "developer",
    want: "comprehensive Jest tests across rules, schemas, and utils",
    why: "core-logic correctness is non-negotiable; it is reused everywhere",
    priority: "P0 · Prototype", points: 3, phase: "Week 2",
    depends: "US-E2-002, US-E2-004, US-E2-005, US-E2-006, US-E2-007",
    accept: [
      "Coverage report shows ≥ 80% lines, ≥ 70% branches",
      "CI gate fails if coverage drops",
    ],
  }),
]);

// ===== EPIC 3 — DATABASE =====
sections.push([
  H1("5. Epic E3 — Database and Migrations"),
  ...story({
    id: "US-E3-001", title: "Wire TypeORM in apps/api", persona: "developer",
    want: "TypeORM module configured to read `DATABASE_URL` and synchronize=false (migrations only)",
    why: "no surprise schema drift from auto-sync in any environment",
    priority: "P0 · Prototype", points: 2, phase: "Week 1",
    depends: "US-E1-005",
    accept: [
      "`TypeOrmModule.forRootAsync` configured with env",
      "Logging level set via env",
      "`synchronize: false` in all environments",
    ],
  }),
  ...story({
    id: "US-E3-002", title: "Create initial migration: tenants, users, students", persona: "developer",
    want: "the foundational tables with UUID PKs, indexes, and FKs",
    why: "all later features have somewhere to write",
    priority: "P0 · Prototype", points: 3, phase: "Week 1",
    depends: "US-E3-001, US-E2-004",
    frs: "FR-SCHOOL-001, FR-STU-001",
    accept: [
      "All three tables created with `id UUID PRIMARY KEY`",
      "`schoolId` FK on users and students",
      "Indexes: users(school_id), students(school_id)",
      "Migration runs and rolls back cleanly in test DB",
    ],
  }),
  ...story({
    id: "US-E3-003", title: "Create migration: access_tokens, payments", persona: "developer",
    want: "tables for payment lifecycle and access tokens",
    why: "M-Pesa flow has a place to land",
    priority: "P0 · Prototype", points: 2, phase: "Week 2",
    depends: "US-E3-002",
    frs: "FR-PAY-003, FR-PAY-004",
    accept: [
      "access_tokens with index on (user_id, valid_until DESC)",
      "payments with UNIQUE index on mpesa_receipt",
      "FKs to users and tenants",
    ],
  }),
  ...story({
    id: "US-E3-004", title: "Create migration: attendance", persona: "developer",
    want: "the attendance table with status enum and synced_at",
    why: "the prototype's most-demoed feature has storage",
    priority: "P0 · Prototype", points: 2, phase: "Week 2",
    depends: "US-E3-002",
    frs: "FR-ATT-001",
    accept: [
      "Status is a VARCHAR with CHECK or enum constraint",
      "Indexes: (school_id, date), (student_id, date)",
      "`synced_at` nullable",
    ],
  }),
  ...story({
    id: "US-E3-005", title: "Add RLS policies (P1)", persona: "developer",
    want: "PostgreSQL Row Level Security policies on tenant-scoped tables",
    why: "defence in depth: even a buggy query can't leak across tenants",
    priority: "P1 · MVP", points: 3, phase: "Post-prototype",
    depends: "US-E3-002, US-E3-003, US-E3-004",
    frs: "FR-TENANT-005",
    accept: [
      "Policies filter by `school_id = current_setting('app.school_id')::uuid`",
      "API sets the setting per request via interceptor",
      "Integration test: direct DB query without the setting returns 0 rows",
    ],
  }),
]);

// ===== EPIC 4 — AUTH =====
sections.push([
  H1("6. Epic E4 — Authentication and Sessions"),
  ...story({
    id: "US-E4-001", title: "Implement password hashing", persona: "API developer",
    want: "a bcrypt-backed `hash()` / `compare()` service",
    why: "passwords are never stored or logged in plaintext",
    priority: "P0 · Prototype", points: 1, phase: "Week 2",
    frs: "FR-AUTH-004, NFR-SEC-002",
    accept: [
      "bcrypt cost 12",
      "Unit test: hash differs each call; compare returns true for same input",
    ],
  }),
  ...story({
    id: "US-E4-002", title: "Implement POST /auth/login", persona: "user",
    want: "to exchange phone + password for an access token and refresh token",
    why: "I can sign into the app",
    priority: "P0 · Prototype", points: 3, phase: "Week 2",
    depends: "US-E4-001, US-E3-002",
    frs: "FR-AUTH-001, FR-AUTH-002, FR-AUTH-003",
    accept: [
      "Valid credentials return `{ accessToken, refreshToken, user }` with 200",
      "Invalid credentials return 401 with `{ code: INVALID_CREDENTIALS }`",
      "Access token JWT has 15-minute expiry",
      "Refresh token persisted server-side with 7-day expiry",
      "Integration test covers both paths",
    ],
  }),
  ...story({
    id: "US-E4-003", title: "Implement JWT strategy and `@CurrentUser()`", persona: "API developer",
    want: "a Passport JWT strategy plus a decorator that injects the authenticated user",
    why: "every protected controller stays one line",
    priority: "P0 · Prototype", points: 2, phase: "Week 2",
    depends: "US-E4-002",
    accept: [
      "JWT strategy validates signature and expiry",
      "`@CurrentUser()` parameter decorator returns the user record",
      "Unauthenticated request to a protected route returns 401",
    ],
  }),
  ...story({
    id: "US-E4-004", title: "Implement POST /auth/refresh", persona: "user",
    want: "to silently refresh my access token without re-logging in",
    why: "I don't get bounced out every 15 minutes",
    priority: "P0 · Prototype", points: 2, phase: "Week 2",
    depends: "US-E4-002",
    frs: "FR-AUTH-003",
    accept: [
      "Valid refresh token issues a new access token",
      "Refresh token rotates on use",
      "Expired or revoked refresh token returns 401",
    ],
  }),
  ...story({
    id: "US-E4-005", title: "Implement POST /auth/logout", persona: "user",
    want: "to end my session deterministically",
    why: "shared devices stay safe",
    priority: "P0 · Prototype", points: 1, phase: "Week 2",
    depends: "US-E4-004",
    frs: "FR-AUTH-005",
    accept: [
      "Refresh token marked revoked",
      "Subsequent refresh returns 401",
    ],
  }),
  ...story({
    id: "US-E4-006", title: "SMS OTP password reset", persona: "user",
    want: "to reset my password via an OTP sent to my M-Pesa-registered phone",
    why: "I never have to call the school admin to unlock my account",
    priority: "P1 · MVP", points: 5, phase: "Post-prototype",
    frs: "FR-AUTH-006",
    accept: [
      "OTP delivered to phone in < 60s",
      "OTP expires in 5 minutes",
      "Max 3 attempts per OTP, then a fresh request needed",
    ],
  }),
]);

// ===== EPIC 5 — MULTI-TENANT API =====
sections.push([
  H1("7. Epic E5 — Multi-Tenant API Layer"),
  ...story({
    id: "US-E5-001", title: "Implement TenantGuard", persona: "API developer",
    want: "a guard that reads `X-School-ID`, validates it, and attaches `schoolId` to the request",
    why: "every controller can trust the schoolId on the request",
    priority: "P0 · Prototype", points: 2, phase: "Week 2",
    depends: "US-E3-002",
    frs: "FR-TENANT-001, FR-TENANT-002",
    accept: [
      "Missing header → 400 with `{ code: MISSING_SCHOOL_ID }`",
      "Malformed UUID → 400 with `{ code: INVALID_SCHOOL_ID }`",
      "Unknown schoolId → 404 with `{ code: SCHOOL_NOT_FOUND }`",
      "Valid → request.schoolId set, downstream code uses it",
      "Unit tests cover all four paths",
    ],
  }),
  ...story({
    id: "US-E5-002", title: "Implement `@SchoolId()` parameter decorator", persona: "API developer",
    want: "a decorator that surfaces the request's schoolId in controllers",
    why: "controllers don't reach into the raw request",
    priority: "P0 · Prototype", points: 1, phase: "Week 2",
    depends: "US-E5-001",
    accept: [
      "Decorator returns `request.schoolId` typed as string",
      "Throws if used without TenantGuard upstream",
    ],
  }),
  ...story({
    id: "US-E5-003", title: "Apply TenantGuard globally to feature modules", persona: "API developer",
    want: "TenantGuard applied to every feature controller (except /auth, /payments/callback)",
    why: "no controller can accidentally skip the check",
    priority: "P0 · Prototype", points: 2, phase: "Week 3",
    depends: "US-E5-001, US-E4-003",
    frs: "FR-TENANT-003",
    accept: [
      "Decorator or module-level binding makes the default protected",
      "Auth and Daraja callback routes opt out explicitly",
      "Integration test: GET /students without header returns 400",
    ],
  }),
  ...story({
    id: "US-E5-004", title: "Cross-tenant request rejection test", persona: "QA / developer",
    want: "an automated test proving a Tenant A JWT cannot access Tenant B data",
    why: "this is the headline security guarantee",
    priority: "P0 · Prototype", points: 2, phase: "Week 3",
    depends: "US-E5-003",
    frs: "FR-TENANT-003, UC-05",
    accept: [
      "Test seeds two tenants and one user in Tenant A",
      "GET /students with Tenant B's X-School-ID returns 403 or empty result (depending on implementation)",
      "Test runs in CI",
    ],
  }),
  ...story({
    id: "US-E5-005", title: "Request-scoped TenantContext provider", persona: "API developer",
    want: "a `TenantContext` injected as REQUEST-scoped, exposing schoolId and user",
    why: "services don't pass schoolId through every signature",
    priority: "P0 · Prototype", points: 2, phase: "Week 3",
    depends: "US-E5-001, US-E4-003",
    accept: [
      "Provider scoped REQUEST",
      "Used by at least one service (students or attendance)",
    ],
  }),
]);

// ===== EPIC 6 — SCHOOL & USERS =====
sections.push([
  H1("8. Epic E6 — School and User Management"),
  ...story({
    id: "US-E6-001", title: "GET /tenants/me", persona: "admin",
    want: "to fetch my school's profile",
    why: "the dashboard can render school name and status",
    priority: "P0 · Prototype", points: 1, phase: "Week 3",
    depends: "US-E5-003",
    accept: [
      "Returns name, tier, flatFeeStatus, contact",
      "Inaccessible without auth",
    ],
  }),
  ...story({
    id: "US-E6-002", title: "GET /users", persona: "admin",
    want: "to list users in my school",
    why: "I can see who has access",
    priority: "P0 · Prototype", points: 1, phase: "Week 3",
    depends: "US-E5-003",
    frs: "FR-SCHOOL-002",
    accept: [
      "Returns users filtered by schoolId",
      "Excludes password hash from response",
    ],
  }),
  ...story({
    id: "US-E6-003", title: "POST /users (admin creates teacher/finance)", persona: "admin",
    want: "to create a new user with a role",
    why: "I onboard new staff without engineering involvement",
    priority: "P0 · Prototype", points: 3, phase: "Week 3",
    depends: "US-E6-002",
    frs: "FR-SCHOOL-002",
    accept: [
      "Body: name, phone, role, password",
      "Phone validated as Kenyan format",
      "Password hashed; user persisted with schoolId from request",
      "Duplicate phone within tenant returns 409",
    ],
  }),
  ...story({
    id: "US-E6-004", title: "PATCH /users/:id", persona: "admin",
    want: "to edit a user's role, name, or active status",
    why: "staff change roles; I shouldn't recreate them",
    priority: "P1 · MVP", points: 2, phase: "Post-prototype",
    depends: "US-E6-003",
    frs: "FR-SCHOOL-003",
    accept: [
      "Partial updates supported",
      "Only admin role may update",
      "Deactivated user cannot log in",
    ],
  }),
  ...story({
    id: "US-E6-005", title: "Admin resets another user's password", persona: "admin",
    want: "to set a temporary password for a user who has been locked out",
    why: "schools need a fallback when SMS OTP is unreachable",
    priority: "P1 · MVP", points: 3, phase: "Post-prototype",
    frs: "FR-SCHOOL-005",
    accept: [
      "POST /users/:id/reset-password generates a temp password",
      "User flagged `mustChangePassword=true`; forced on next login",
      "Old refresh tokens revoked",
    ],
  }),
  ...story({
    id: "US-E6-006", title: "Self-service school sign-up", persona: "new school",
    want: "to sign up online without a sales call",
    why: "the funnel can grow without manual onboarding",
    priority: "P2 · Roadmap", points: 8, phase: "Post-MVP",
    accept: [
      "Public landing page → email verification → first admin user",
      "Captcha or rate limit to prevent spam tenants",
    ],
  }),
]);

// ===== EPIC 7 — STUDENTS =====
sections.push([
  H1("9. Epic E7 — Student Records"),
  ...story({
    id: "US-E7-001", title: "GET /students with filtering", persona: "admin / teacher",
    want: "a paginated list filterable by grade and name",
    why: "I can quickly find any student",
    priority: "P0 · Prototype", points: 2, phase: "Week 3",
    depends: "US-E5-003",
    frs: "FR-STU-004",
    accept: [
      "Pagination via `page` and `pageSize`",
      "Search matches case-insensitive substring of name",
      "Grade filter exact-match",
    ],
  }),
  ...story({
    id: "US-E7-002", title: "POST /students (add student)", persona: "admin",
    want: "to enrol a new student with name, grade, DOB, guardian phone",
    why: "the roster is mine to manage",
    priority: "P0 · Prototype", points: 2, phase: "Week 3",
    depends: "US-E7-001",
    frs: "FR-STU-001",
    accept: [
      "UUID v7 id assigned server-side (or honoured if client-generated, with validation)",
      "Required: name, grade; optional: DOB, guardianPhone",
      "Returns 201 with student object",
    ],
  }),
  ...story({
    id: "US-E7-003", title: "PATCH /students/:id (edit)", persona: "admin",
    want: "to update a student's profile",
    why: "details change over time (guardian phone, grade)",
    priority: "P0 · Prototype", points: 2, phase: "Week 3",
    depends: "US-E7-002",
    frs: "FR-STU-002",
    accept: [
      "Partial body; validated by Zod",
      "Concurrent edits: last write wins for now",
    ],
  }),
  ...story({
    id: "US-E7-004", title: "Archive (soft delete) a student", persona: "admin",
    want: "to remove a student from active rosters without losing history",
    why: "history matters and accidents happen",
    priority: "P0 · Prototype", points: 1, phase: "Week 3",
    depends: "US-E7-003",
    frs: "FR-STU-003",
    accept: [
      "Sets `is_archived = true`",
      "Default list endpoints exclude archived",
      "`?includeArchived=true` reveals them",
    ],
  }),
  ...story({
    id: "US-E7-005", title: "Bulk CSV import students", persona: "admin",
    want: "to upload a CSV and create many students at once",
    why: "onboarding 300 students one-by-one isn't realistic",
    priority: "P1 · MVP", points: 5, phase: "Post-prototype",
    frs: "FR-STU-005",
    accept: [
      "Endpoint accepts multipart/form-data CSV",
      "Per-row validation; reports row-level errors",
      "Partial success allowed; idempotent on retry",
    ],
  }),
]);

// ===== EPIC 8 — ATTENDANCE =====
sections.push([
  H1("10. Epic E8 — Attendance"),
  ...story({
    id: "US-E8-001", title: "POST /attendance (bulk submit)", persona: "teacher",
    want: "to submit attendance for my entire class in one request",
    why: "one tap per pupil, one save",
    priority: "P0 · Prototype", points: 3, phase: "Week 4",
    depends: "US-E7-002",
    frs: "FR-ATT-001",
    accept: [
      "Body is an array of `{ studentId, date, status, note? }`",
      "Validates each entry against AttendanceSchema",
      "Idempotent on (studentId, date): repeated calls update, not duplicate",
    ],
  }),
  ...story({
    id: "US-E8-002", title: "GET /attendance with filters", persona: "admin / teacher",
    want: "to query attendance by date, class, or student",
    why: "the dashboard and history views need data",
    priority: "P0 · Prototype", points: 2, phase: "Week 4",
    depends: "US-E8-001",
    accept: [
      "Filters: date, studentId, teacherId, status",
      "Pagination",
      "Aggregated counts available via `?summary=true`",
    ],
  }),
  ...story({
    id: "US-E8-003", title: "Daily attendance summary on dashboard", persona: "admin",
    want: "to see today's present/absent/late counts at a glance",
    why: "the dashboard answers \"is school on?\" in one screen",
    priority: "P0 · Prototype", points: 2, phase: "Week 4",
    depends: "US-E8-002",
    frs: "FR-ATT-004",
    accept: [
      "Counts broken down by class (grade)",
      "Updates without page refresh after a sync arrives",
    ],
  }),
  ...story({
    id: "US-E8-004", title: "Edit window enforcement (until midnight)", persona: "teacher",
    want: "to correct mistakes for today only",
    why: "yesterday's records shouldn't be silently editable",
    priority: "P0 · Prototype", points: 2, phase: "Week 4",
    depends: "US-E8-001",
    frs: "FR-ATT-003",
    accept: [
      "Same-day edits succeed",
      "Past-day edits return 403 with `{ code: ATT_EDIT_WINDOW_CLOSED }`",
    ],
  }),
  ...story({
    id: "US-E8-005", title: "Attendance history (last 30 days)", persona: "admin",
    want: "to view a student's attendance over the last month",
    why: "patterns inform parent conversations",
    priority: "P1 · MVP", points: 3, phase: "Post-prototype",
    frs: "FR-ATT-005",
    accept: [
      "Calendar view with status colour coding",
      "Exportable as CSV",
    ],
  }),
  ...story({
    id: "US-E8-006", title: "Late-entry approval workflow", persona: "teacher / admin",
    want: "to request and approve out-of-window attendance edits",
    why: "real life requires legitimate corrections",
    priority: "P1 · MVP", points: 5, phase: "Post-prototype",
    frs: "FR-ATT-006",
    accept: [
      "Teacher request creates a pending change",
      "Admin sees inbox; approve or reject",
      "Audit row records the resolution",
    ],
  }),
]);

// ===== EPIC 9 — M-PESA =====
sections.push([
  H1("11. Epic E9 — M-Pesa Daraja Integration"),
  ...story({
    id: "US-E9-001", title: "Daraja OAuth: fetch and cache access token", persona: "API developer",
    want: "a service that fetches Daraja access tokens and caches them until just before expiry",
    why: "every STK Push call needs a valid bearer token, with minimum overhead",
    priority: "P0 · Prototype", points: 3, phase: "Week 2",
    accept: [
      "Reads `DARAJA_CONSUMER_KEY`/`SECRET` from env",
      "Calls Daraja `/oauth/v1/generate?grant_type=client_credentials`",
      "Caches token in memory, refreshes 30s before expiry",
      "Unit test mocks the HTTP layer",
    ],
  }),
  ...story({
    id: "US-E9-002", title: "DarajaService.stkPush()", persona: "API developer",
    want: "a wrapper that builds the STK Push payload and submits it",
    why: "the payments service stays high-level",
    priority: "P0 · Prototype", points: 3, phase: "Week 2",
    depends: "US-E9-001",
    accept: [
      "Builds correct password using shortcode + passkey + timestamp",
      "TransactionType: CustomerPayBillOnline",
      "AccountReference and TransactionDesc surface our internal payment ID",
      "Returns Daraja CheckoutRequestID",
    ],
  }),
  ...story({
    id: "US-E9-003", title: "POST /payments/initiate", persona: "user",
    want: "to start a payment for a chosen pass",
    why: "I can buy sync access in one tap",
    priority: "P0 · Prototype", points: 3, phase: "Week 2",
    depends: "US-E9-002, US-E2-005",
    frs: "FR-PAY-001, FR-PAY-002",
    accept: [
      "Body validated: `{ pass, phone? }` (phone defaults to user.phone)",
      "Creates `payments` row with status=pending and amount from priceKES()",
      "Returns `{ paymentId, status: pending, checkoutRequestId }`",
      "STK Push appears on user's phone within 5s (sandbox)",
    ],
  }),
  ...story({
    id: "US-E9-004", title: "POST /payments/callback (idempotent)", persona: "Daraja",
    want: "to deliver the payment result reliably",
    why: "Safaricom may retry; we cannot double-issue tokens",
    priority: "P0 · Prototype", points: 5, phase: "Week 2",
    depends: "US-E9-003, US-E3-003",
    frs: "FR-PAY-003, FR-PAY-004, NFR-REL-002",
    accept: [
      "Validates payload via Zod",
      "Looks up payment by CheckoutRequestID",
      "On success: stores MpesaReceiptNumber, sets status=success, issues access token via AccessTokenService, emits WebSocket event",
      "On failure: status=failed, reason recorded",
      "Duplicate callback for same MpesaReceiptNumber updates nothing and returns 200",
      "Integration test covers duplicate, success, failure",
    ],
  }),
  ...story({
    id: "US-E9-005", title: "WebSocket `access:granted` event", persona: "client",
    want: "to know the moment my access token is live",
    why: "users don't poll; UX feels instant",
    priority: "P0 · Prototype", points: 2, phase: "Week 3",
    depends: "US-E9-004",
    frs: "FR-PAY-005",
    accept: [
      "Socket.IO room per user (`user:<userId>`)",
      "Emit `access:granted` with `{ validUntil }` on token issuance",
      "Client unit test using mock socket transitions UI state",
    ],
  }),
  ...story({
    id: "US-E9-006", title: "GET /payments (own history)", persona: "user",
    want: "to see my recent payments and their status",
    why: "I can troubleshoot a missing access window without calling support",
    priority: "P1 · MVP", points: 2, phase: "Post-prototype",
    frs: "FR-PAY-007",
    accept: [
      "Returns last 90 days",
      "Includes M-Pesa receipt and pass type",
    ],
  }),
]);

// ===== EPIC 10 — ACCESS TOKENS & ENFORCEMENT =====
sections.push([
  H1("12. Epic E10 — Access Tokens and Enforcement"),
  ...story({
    id: "US-E10-001", title: "AccessTokenService.createAccessToken()", persona: "API developer",
    want: "a service that issues access tokens from (userId, role, pass, paymentRef)",
    why: "the M-Pesa callback flow has a one-call hand-off",
    priority: "P0 · Prototype", points: 2, phase: "Week 3",
    depends: "US-E3-003, US-E2-006",
    accept: [
      "Computes validUntil = now + accessDurationHours(pass)",
      "Persists row with payment_ref",
      "Returns the persisted entity",
    ],
  }),
  ...story({
    id: "US-E10-002", title: "AccessGuard implementation", persona: "API developer",
    want: "a NestJS guard that allows the request iff a valid access token exists or the school's admin flat fee is active",
    why: "sync endpoints are reliably gated",
    priority: "P0 · Prototype", points: 3, phase: "Week 3",
    depends: "US-E10-001, US-E4-003, US-E5-001",
    frs: "FR-ACC-002, FR-ACC-003",
    accept: [
      "Looks up most recent token for userId",
      "Calls `isAccessValid` from core-logic",
      "Allows admin role iff tenants.flatFeeStatus = 'active'",
      "On reject: 402 with `{ code: ACCESS_EXPIRED, upgradeUrl: /pay }`",
    ],
  }),
  ...story({
    id: "US-E10-003", title: "Apply AccessGuard to /sync/* routes", persona: "API developer",
    want: "sync endpoints inherit AccessGuard",
    why: "no sync route can skip the access check",
    priority: "P0 · Prototype", points: 1, phase: "Week 3",
    depends: "US-E10-002",
    accept: [
      "Controller decorator wires the guard",
      "Integration test: POST /sync/push without access → 402",
    ],
  }),
  ...story({
    id: "US-E10-004", title: "Admin manual token issuance (comp days, manual flat-fee onboarding)", persona: "admin",
    want: "to grant access manually with a reason",
    why: "edge cases (paid by other means, troubleshooting)",
    priority: "P1 · MVP", points: 3, phase: "Post-prototype",
    frs: "FR-PAY-008",
    accept: [
      "POST /access-tokens/manual with `{ userId, pass, reason }`",
      "Only admins permitted",
      "Audited in access log with the reason",
    ],
  }),
  ...story({
    id: "US-E10-005", title: "Token revocation", persona: "admin",
    want: "to revoke an active access token immediately",
    why: "suspended users must lose sync immediately",
    priority: "P1 · MVP", points: 2, phase: "Post-prototype",
    frs: "FR-ACC-005",
    accept: [
      "POST /access-tokens/:id/revoke sets validUntil = now",
      "Takes effect on next sync attempt",
    ],
  }),
]);

// ===== EPIC 11 — SYNC PUSH =====
sections.push([
  H1("13. Epic E11 — Sync (Push)"),
  ...story({
    id: "US-E11-001", title: "PowerSync server connector setup", persona: "developer",
    want: "PowerSync configured to read from Postgres with tenant-filtered sync rules",
    why: "the prototype demonstrates the engine that the MVP will rely on",
    priority: "P0 · Prototype", points: 5, phase: "Week 3–4",
    depends: "US-E3-004",
    accept: [
      "`sync_rules.yaml` filters every replicated table by `school_id`",
      "Connector reads from Postgres replica or primary",
      "Smoke test: a row inserted via API appears on a connected client",
    ],
  }),
  ...story({
    id: "US-E11-002", title: "Client SQLite schema mirrors Postgres", persona: "client developer",
    want: "an Expo/Electron SQLite schema with the same tables and a `is_dirty` flag",
    why: "offline writes are queueable for sync",
    priority: "P0 · Prototype", points: 3, phase: "Week 3–4",
    accept: [
      "Tables: users, students, attendance, access_tokens (read-only on client)",
      "All tables include `is_dirty BOOLEAN DEFAULT 0` and `synced_at` where applicable",
      "Schema initialised on first launch via migration",
    ],
  }),
  ...story({
    id: "US-E11-003", title: "Push dirty attendance to server", persona: "teacher",
    want: "my offline attendance to appear on the cloud the moment I have access",
    why: "the admin sees today's roll within seconds",
    priority: "P0 · Prototype", points: 3, phase: "Week 4",
    depends: "US-E11-002, US-E10-003",
    frs: "FR-SYNC-001, FR-SYNC-003",
    accept: [
      "Sync button finds dirty rows, batches them, POSTs to /sync/push (or PowerSync equivalent)",
      "On 200: rows marked clean and `synced_at` stamped",
      "On 402: client transitions to payment prompt",
      "On 5xx: rows remain dirty",
    ],
  }),
  ...story({
    id: "US-E11-004", title: "Sync progress UI", persona: "user",
    want: "to see how many records remain in a sync run",
    why: "large syncs feel responsive",
    priority: "P1 · MVP", points: 2, phase: "Post-prototype",
    frs: "FR-SYNC-006",
    accept: [
      "Progress bar or `n of m` indicator",
      "Cancellable",
    ],
  }),
  ...story({
    id: "US-E11-005", title: "Sync state indicator on every screen", persona: "user",
    want: "to know my sync status without thinking about it",
    why: "I trust the system when I can see it working",
    priority: "P0 · Prototype", points: 2, phase: "Week 4",
    depends: "US-E11-003",
    accept: [
      "Top bar shows: offline / online / paid (Xh left) / unpaid",
      "Colour-coded; tooltip explains state",
    ],
  }),
]);

// ===== EPIC 12 — SYNC PULL (MVP) =====
sections.push([
  H1("14. Epic E12 — Sync (Pull + Conflict, MVP)"),
  ...story({
    id: "US-E12-001", title: "Pull sync delta from server", persona: "client",
    want: "to receive changes made on other devices since my last sync",
    why: "multi-device schools see consistent state",
    priority: "P1 · MVP", points: 5, phase: "Post-prototype",
    frs: "FR-SYNC-004",
    accept: [
      "Server returns changes since `?since=` timestamp",
      "Client applies them in order",
      "No data loss on interrupted pull",
    ],
  }),
  ...story({
    id: "US-E12-002", title: "Last-write-wins conflict resolution per entity", persona: "client",
    want: "deterministic resolution of conflicting edits",
    why: "two teachers editing the same record don't silently corrupt data",
    priority: "P1 · MVP", points: 5, phase: "Post-prototype",
    frs: "FR-SYNC-004",
    accept: [
      "Per-entity policy; updated_at decides",
      "Loser's edit logged for audit",
    ],
  }),
  ...story({
    id: "US-E12-003", title: "Exponential backoff on failed sync", persona: "client",
    want: "retries that don't hammer the server during outages",
    why: "outages stay short and respectful of resources",
    priority: "P1 · MVP", points: 2, phase: "Post-prototype",
    frs: "FR-SYNC-005",
    accept: [
      "Backoff schedule e.g. 5s, 15s, 60s, 5min",
      "User can force retry",
    ],
  }),
  ...story({
    id: "US-E12-004", title: "Selective sync (term-scoped on mobile)", persona: "teacher",
    want: "only this term's data on my phone",
    why: "storage and bandwidth are precious",
    priority: "P2 · Roadmap", points: 5, phase: "Post-MVP",
    frs: "FR-SYNC-007",
    accept: [
      "Configurable per role",
      "Old data still accessible on demand from cloud",
    ],
  }),
]);

// ===== EPIC 13 — DESKTOP =====
sections.push([
  H1("15. Epic E13 — Desktop App (Electron + React)"),
  ...story({
    id: "US-E13-001", title: "Electron + Vite + React skeleton", persona: "developer",
    want: "a working Electron shell loading a Vite+React renderer",
    why: "all desktop UI lives somewhere",
    priority: "P0 · Prototype", points: 3, phase: "Week 3",
    depends: "US-E1-001",
    accept: [
      "`pnpm --filter desktop dev` opens an Electron window",
      "Hot reload works",
      "Production build produces an installer for Windows",
    ],
  }),
  ...story({
    id: "US-E13-002", title: "Login screen", persona: "admin",
    want: "a login form with phone and password",
    why: "I can authenticate from the desktop",
    priority: "P0 · Prototype", points: 2, phase: "Week 3",
    depends: "US-E13-001, US-E4-002",
    accept: [
      "Form validates on the client (Zod) before submit",
      "Success navigates to dashboard",
      "Failure shows actionable error",
    ],
  }),
  ...story({
    id: "US-E13-003", title: "Dashboard with attendance summary", persona: "admin",
    want: "today's roll counts and recent syncs at a glance",
    why: "the daily routine starts here",
    priority: "P0 · Prototype", points: 3, phase: "Week 3",
    depends: "US-E13-002, US-E8-003",
    accept: [
      "Counts by class (grade) for today",
      "Recent 5 sync events visible",
      "Empty states clear (\"No attendance yet today\")",
    ],
  }),
  ...story({
    id: "US-E13-004", title: "Students screen (list, add, edit, archive)", persona: "admin",
    want: "to manage the student roster",
    why: "this is the system of record",
    priority: "P0 · Prototype", points: 3, phase: "Week 3",
    depends: "US-E13-002, US-E7-002, US-E7-003, US-E7-004",
    accept: [
      "Search and grade filter",
      "Add and edit modals validated against StudentSchema",
      "Archive with undo (5s)",
    ],
  }),
  ...story({
    id: "US-E13-005", title: "Users screen (list, add, edit)", persona: "admin",
    want: "to onboard staff",
    why: "I need control over who has access",
    priority: "P0 · Prototype", points: 2, phase: "Week 3",
    depends: "US-E13-002, US-E6-003",
    accept: [
      "List filterable by role",
      "Add modal with role picker",
    ],
  }),
  ...story({
    id: "US-E13-006", title: "Access Log screen", persona: "admin",
    want: "a chronological view of all payments and access windows",
    why: "every shilling and every access is traceable",
    priority: "P0 · Prototype", points: 2, phase: "Week 4",
    depends: "US-E13-002, US-E9-004",
    accept: [
      "Columns: when, who, pass, amount, M-Pesa receipt, valid window",
      "Filter by user and date range",
      "Empty state explains how rows appear",
    ],
  }),
  ...story({
    id: "US-E13-007", title: "Local SQLite + offline reads on desktop", persona: "admin",
    want: "the desktop to work without internet for reads",
    why: "schools shouldn't lose their dashboard when wifi blips",
    priority: "P0 · Prototype", points: 3, phase: "Week 4",
    depends: "US-E13-001, US-E11-002",
    accept: [
      "Read-side queries hit SQLite first",
      "Network calls only for sync and payments",
    ],
  }),
  ...story({
    id: "US-E13-008", title: "Standalone Electron mode toggle (P1)", persona: "admin",
    want: "to run the desktop with no cloud connection at all",
    why: "very-remote schools may opt out of cloud entirely",
    priority: "P1 · MVP", points: 8, phase: "Post-prototype",
    frs: "FR-OFFLINE-005",
    accept: [
      "Toggle in Settings; persisted",
      "When on, hides sync UI; disables payment endpoints",
      "Documented limitations clear to user",
    ],
  }),
]);

// ===== EPIC 14 — MOBILE =====
sections.push([
  H1("16. Epic E14 — Mobile App (Expo, Android)"),
  ...story({
    id: "US-E14-001", title: "Expo skeleton with Android build", persona: "developer",
    want: "an Expo app that builds and runs on a real Android device",
    why: "every teacher feature ships from here",
    priority: "P0 · Prototype", points: 3, phase: "Week 4",
    depends: "US-E1-001",
    accept: [
      "`pnpm --filter mobile start` launches Expo",
      "APK builds via `eas build --platform android --profile preview`",
      "Runs on baseline 2 GB device without crashing",
    ],
  }),
  ...story({
    id: "US-E14-002", title: "Login screen (phone + password)", persona: "teacher",
    want: "to sign in with the phone number my admin set up",
    why: "first impression of the app",
    priority: "P0 · Prototype", points: 2, phase: "Week 4",
    depends: "US-E14-001, US-E4-002",
    accept: [
      "Phone accepts +254… or 07…; normalises on submit",
      "Forgot password CTA points to admin reset path (P1: SMS OTP)",
    ],
  }),
  ...story({
    id: "US-E14-003", title: "Class roster + attendance capture", persona: "teacher",
    want: "to mark each student present, absent, or late with one tap",
    why: "speed is the whole point",
    priority: "P0 · Prototype", points: 5, phase: "Week 4–5",
    depends: "US-E14-002, US-E8-001, US-E11-002",
    accept: [
      "Roster loaded from local SQLite",
      "Tap cycles Present → Absent → Late",
      "Save button persists immediately, even offline",
      "Visual confirmation on save",
    ],
  }),
  ...story({
    id: "US-E14-004", title: "Sync button + state indicator", persona: "teacher",
    want: "a sync button that shows my access state and triggers sync",
    why: "I always know whether I'm paid up",
    priority: "P0 · Prototype", points: 2, phase: "Week 4–5",
    depends: "US-E14-003, US-E11-003, US-E11-005",
    accept: [
      "Button shows: \"Sync (paid, 4h left)\" or \"Sync (pay required)\"",
      "On 402, opens the payment modal directly",
    ],
  }),
  ...story({
    id: "US-E14-005", title: "M-Pesa payment modal (pass selection + initiate)", persona: "teacher",
    want: "to buy a day/week/month pass without leaving the app",
    why: "payment friction is the conversion killer",
    priority: "P0 · Prototype", points: 3, phase: "Week 4–5",
    depends: "US-E14-004, US-E9-003",
    accept: [
      "Three pass options with KES prices from priceKES()",
      "Confirms phone number, calls /payments/initiate",
      "Shows \"Waiting for confirmation…\" with cancel",
    ],
  }),
  ...story({
    id: "US-E14-006", title: "Listen for `access:granted` WebSocket", persona: "teacher",
    want: "the app to unlock automatically the moment my payment lands",
    why: "magical UX = high conversion",
    priority: "P0 · Prototype", points: 2, phase: "Week 5",
    depends: "US-E14-005, US-E9-005",
    accept: [
      "Socket connects on login; reconnects on network resume",
      "Receiving access:granted closes payment modal, triggers sync",
    ],
  }),
  ...story({
    id: "US-E14-007", title: "Offline indicator + retry queue", persona: "teacher",
    want: "to know I'm offline and that my work is safe",
    why: "trust",
    priority: "P0 · Prototype", points: 2, phase: "Week 5",
    depends: "US-E14-003",
    frs: "FR-OFFLINE-003",
    accept: [
      "Detects connectivity loss within 2s",
      "Shows a non-intrusive banner",
      "Queued ops list available in Settings",
    ],
  }),
  ...story({
    id: "US-E14-008", title: "App icon, splash, theme polish", persona: "demo lead",
    want: "the app to look credible in a demo",
    why: "first impressions sway stakeholders",
    priority: "P0 · Prototype", points: 1, phase: "Week 5",
    depends: "US-E14-001",
    accept: [
      "Branded splash screen",
      "Consistent colour palette",
      "Adaptive icon for Android",
    ],
  }),
]);

// ===== EPIC 15 — SEED DATA =====
sections.push([
  H1("17. Epic E15 — Demo Data and Seed"),
  ...story({
    id: "US-E15-001", title: "Seed script: 1 school + users", persona: "demo lead",
    want: "a one-command seed that creates Riverbank Academy with one admin, two teachers, one finance",
    why: "every demo starts identical",
    priority: "P0 · Prototype", points: 2, phase: "Week 5",
    depends: "US-E3-002, US-E6-003",
    accept: [
      "`pnpm seed` resets DB and seeds users",
      "Passwords printed to stdout for demo use",
    ],
  }),
  ...story({
    id: "US-E15-002", title: "Seed: 30 students across Grades 3–6", persona: "demo lead",
    want: "realistic Kenyan names spread over four grades",
    why: "the demo looks like a real school",
    priority: "P0 · Prototype", points: 1, phase: "Week 5",
    depends: "US-E15-001",
    accept: [
      "Names from a small curated list (Kenyan-first-name + Kenyan-surname)",
      "Even spread across grades",
    ],
  }),
  ...story({
    id: "US-E15-003", title: "Seed: 2 weeks of attendance + 3 access tokens", persona: "demo lead",
    want: "history that makes the dashboard interesting and the access log realistic",
    why: "the dashboard isn't empty on first launch",
    priority: "P0 · Prototype", points: 2, phase: "Week 5",
    depends: "US-E15-002",
    accept: [
      "~150 attendance rows (some absences and late marks)",
      "One expired token, one active (admin flat-fee), one fresh from M-Pesa sandbox",
    ],
  }),
]);

// ===== EPIC 16 — DEMO POLISH =====
sections.push([
  H1("18. Epic E16 — Demo Polish and Scripts"),
  ...story({
    id: "US-E16-001", title: "Write DEMO_SCRIPT.md", persona: "demo lead",
    want: "a step-by-step walkthrough of all five demo scenarios",
    why: "anyone on the team can deliver the demo",
    priority: "P0 · Prototype", points: 1, phase: "Week 5",
    accept: [
      "One page per scenario",
      "Includes screenshots from the prototype",
      "Lists the exact talking point for each step",
    ],
  }),
  ...story({
    id: "US-E16-002", title: "Internal dry-run with team", persona: "team",
    want: "to run the full demo internally and capture issues",
    why: "no live demo runs untested",
    priority: "P0 · Prototype", points: 1, phase: "Week 5",
    accept: [
      "Issues triaged within 24h",
      "Critical issues fixed before stakeholder demo",
    ],
  }),
  ...story({
    id: "US-E16-003", title: "Record Loom (leave-behind)", persona: "demo lead",
    want: "a 10-minute screen recording covering the prototype",
    why: "stakeholders can re-watch and share",
    priority: "P0 · Prototype", points: 2, phase: "Week 6",
    depends: "US-E16-001",
    accept: [
      "Audio-narrated by the demo lead",
      "Captioned for accessibility",
      "Hosted privately; link in handover",
    ],
  }),
  ...story({
    id: "US-E16-004", title: "Fallback \"simulate payment\" admin toggle", persona: "demo lead",
    want: "to skip the live M-Pesa step if Daraja sandbox is misbehaving",
    why: "no demo dies because of someone else's infra",
    priority: "P0 · Prototype", points: 2, phase: "Week 6",
    accept: [
      "Hidden admin-only endpoint issues an access token directly",
      "UI button only visible with a specific env flag",
      "Used only as last resort during demo",
    ],
  }),
]);

// ===== EPIC 17 — DEVOPS =====
sections.push([
  H1("19. Epic E17 — DevOps and Cloud Deployment (MVP)"),
  ...story({
    id: "US-E17-001", title: "Dockerise the API", persona: "developer",
    want: "a multi-stage Dockerfile producing a small, secure image",
    why: "the same image runs locally and in Cloud Run",
    priority: "P0 · Prototype", points: 2, phase: "Week 5",
    accept: [
      "Image ≤ 200 MB",
      "Non-root user",
      "Healthcheck endpoint reachable",
    ],
  }),
  ...story({
    id: "US-E17-002", title: "GitHub Actions CI: lint, test, build", persona: "developer",
    want: "every PR to fail loudly on regressions",
    why: "the team trusts main",
    priority: "P1 · MVP", points: 3, phase: "Post-prototype",
    accept: [
      "Workflow runs lint, test, build on push and PR",
      "Caches pnpm store",
      "Status checks required before merge",
    ],
  }),
  ...story({
    id: "US-E17-003", title: "Cloud Run deploy via GitHub Actions (WIF)", persona: "developer",
    want: "automated deploys to GCP using Workload Identity Federation",
    why: "no long-lived service account keys",
    priority: "P1 · MVP", points: 5, phase: "Post-prototype",
    accept: [
      "Push to main → image to Artifact Registry → revision on Cloud Run",
      "Migrations run as a Cloud Run Job before serving traffic",
      "Rollback documented",
    ],
  }),
  ...story({
    id: "US-E17-004", title: "Cloud SQL provisioning", persona: "DevOps",
    want: "a managed Postgres 16 instance in africa-south1",
    why: "production data lives somewhere reliable",
    priority: "P1 · MVP", points: 3, phase: "Post-prototype",
    accept: [
      "Private IP, automated backups daily, PITR",
      "Connection from Cloud Run via Cloud SQL Auth Proxy or private VPC",
    ],
  }),
  ...story({
    id: "US-E17-005", title: "Monitoring + error reporting", persona: "DevOps",
    want: "Cloud Logging plus Error Reporting hooked up",
    why: "we know when things break in production",
    priority: "P1 · MVP", points: 2, phase: "Post-prototype",
    accept: [
      "Structured logs (JSON) from API",
      "Errors create incidents in Error Reporting",
      "Email or Slack alert on new-error class",
    ],
  }),
]);

// ===== EPIC 18 — REPORTING & ROADMAP =====
sections.push([
  H1("20. Epic E18 — Reporting and Roadmap (Post-MVP)"),
  P("These items are tracked but not estimated in detail. They become well-formed user stories once MVP feedback shapes them."),
  Bullet("Term and year academic reporting"),
  Bullet("Parent portal (read-only attendance + announcements)"),
  Bullet("Grades and report cards"),
  Bullet("Fee management module (with separate M-Pesa flow)"),
  Bullet("iOS build of the mobile app"),
  Bullet("Swahili localisation"),
  Bullet("Bulk import from school spreadsheets / NEMIS export"),
  Bullet("Self-service school sign-up funnel"),
  Bullet("Multi-school groupings (federations, dioceses)"),
  Bullet("Penetration test and OWASP review"),
  Bullet("Disaster recovery and multi-region"),
]);

// ===== TRACEABILITY MATRIX =====
sections.push([
  H1("21. Traceability Matrix"),
  P("Cross-reference between SRS functional requirements and backlog stories. Use to audit coverage before sprint planning."),
  tableFromRows([
    ["SRS FR", "Stories", "Phase"],
    ["FR-AUTH-001..005", "US-E4-001 … US-E4-005", "Prototype"],
    ["FR-AUTH-006", "US-E4-006", "MVP"],
    ["FR-TENANT-001..004", "US-E5-001 … US-E5-005", "Prototype"],
    ["FR-TENANT-005..006", "US-E3-005, US-E11-001", "MVP"],
    ["FR-SCHOOL-001..003", "US-E6-001 … US-E6-003", "Prototype"],
    ["FR-SCHOOL-004..005", "US-E6-004, US-E6-005", "MVP"],
    ["FR-SCHOOL-006", "US-E6-006", "Roadmap"],
    ["FR-STU-001..004", "US-E7-001 … US-E7-004", "Prototype"],
    ["FR-STU-005..006", "US-E7-005, (photo TBD)", "MVP"],
    ["FR-ATT-001..004", "US-E8-001 … US-E8-004", "Prototype"],
    ["FR-ATT-005..006", "US-E8-005, US-E8-006", "MVP"],
    ["FR-OFFLINE-001..004", "US-E13-007, US-E14-007, US-E11-002", "Prototype + MVP"],
    ["FR-OFFLINE-005", "US-E13-008", "MVP"],
    ["FR-SYNC-001..003", "US-E11-003 … US-E11-005", "Prototype"],
    ["FR-SYNC-004..006", "US-E12-001, US-E12-002, US-E11-004, US-E12-003", "MVP"],
    ["FR-PAY-001..006", "US-E9-001 … US-E9-005", "Prototype"],
    ["FR-PAY-007..008", "US-E9-006, US-E10-004", "MVP"],
    ["FR-ACC-001", "US-E2-007", "Prototype"],
    ["FR-ACC-002..003", "US-E10-001 … US-E10-003", "Prototype"],
    ["FR-ACC-004..005", "US-E10-005", "MVP"],
    ["FR-AUDIT-001", "US-E13-006", "Prototype"],
    ["FR-AUDIT-002..003", "US-E17-005, audit tables (MVP)", "MVP"],
  ], [2200, 5000, 2160]),
]);

const doc = buildDocument({
  title: "Product Backlog",
  subtitle: "Prototype → MVP → Roadmap — epics, stories, acceptance criteria",
  sections,
});

const outPath = path.join(__dirname, "..", "docs", "03-Product-Backlog.docx");
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outPath, buf);
  console.log("Wrote", outPath, "(", buf.length, "bytes )");
});
