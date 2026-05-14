const fs = require("fs");
const path = require("path");
const { Packer, P, H1, H2, H3, Bullet, Numbered, tableFromRows, pageBreak, blankLine, callout, buildDocument } = require("./common");

const sections = [];

// ===== 1. INTRODUCTION =====
sections.push([
  H1("1. Introduction"),

  H2("1.1 Purpose"),
  P("This Software Requirements Specification (SRS) describes the functional and non-functional requirements of the School Management System (SMS) — a local-first, multi-tenant SaaS for Kenyan schools. It is the authoritative reference for what the prototype must do, what the MVP will extend it to do, and what is explicitly out of scope. Engineers, testers, project managers, and stakeholders share this document as the contract for the build."),

  H2("1.2 Document scope"),
  P("This SRS covers two delivery phases:"),
  Bullet("**Prototype phase**: a demonstrable proof of concept proving the offline-first, M-Pesa-funded sync model. Requirements with priority **P0** belong to this phase."),
  Bullet("**MVP phase**: the first production-ready release for paying schools. Requirements with priority **P1** are added in this phase. **P2** requirements are roadmap items beyond MVP."),

  H2("1.3 Definitions, acronyms, abbreviations"),
  tableFromRows([
    ["Term", "Meaning"],
    ["SMS", "School Management System (this product)"],
    ["SaaS", "Software as a Service"],
    ["Tenant", "A school. The primary unit of multi-tenant isolation."],
    ["UUID v7", "Time-ordered universally unique identifier (RFC 9562)"],
    ["JWT", "JSON Web Token — signed authentication token"],
    ["STK Push", "Safaricom SIM Tool Kit Push — payment prompt sent to a user's phone"],
    ["Daraja", "Safaricom's M-Pesa developer API"],
    ["RLS", "Row-Level Security (PostgreSQL feature)"],
    ["Access token (SMS)", "Time-bound JWT issued after successful M-Pesa payment, authorising sync"],
    ["Pass", "Purchasable access window: day | week | month"],
    ["Flat fee", "Monthly school-level subscription covering admin devices"],
    ["KES", "Kenyan Shilling"],
    ["P0 / P1 / P2", "Priority: Prototype / MVP / Roadmap"],
    ["FR / NFR", "Functional Requirement / Non-Functional Requirement"],
  ], [2400, 6960]),

  H2("1.4 References"),
  Bullet("`SMS_ClaudeCode_Handoff.docx` — original engineering bootstrap document kept in `~/Downloads`"),
  Bullet("`01-Project-Blueprint.docx` — stakeholder-facing project blueprint"),
  Bullet("`03-Product-Backlog.docx` — sprint-ready epics and user stories"),
  Bullet("RFC 9562 — UUID v7 specification"),
  Bullet("Safaricom Daraja API — Lipa Na M-Pesa Online (STK Push) reference"),
  Bullet("Kenya Data Protection Act, 2019"),

  H2("1.5 Document conventions"),
  P("Each requirement is identified by a unique tag (e.g., FR-AUTH-001). Tags are stable across versions; if a requirement is dropped its tag is retired, not reused. Priority and source are listed inline."),
]);

// ===== 2. OVERALL DESCRIPTION =====
sections.push([
  H1("2. Overall Description"),

  H2("2.1 Product perspective"),
  P("The SMS is a new, self-contained product. It is not a successor to or integration with an existing school management system. It comprises three deployed components — a NestJS API, an Electron desktop client, and an Expo mobile client — sharing a TypeScript core-logic library and synchronising via PowerSync against a PostgreSQL source of truth."),

  H2("2.2 Product functions (summary)"),
  Bullet("Tenant registration and management (one tenant = one school)"),
  Bullet("User management within a tenant: admin, teacher, finance roles"),
  Bullet("Student records: enrolment, edit, archive"),
  Bullet("Attendance: daily roll, per-class capture, status (present/absent/late)"),
  Bullet("Offline-first operation: all read and most write operations work without internet"),
  Bullet("Sync: push attendance and student edits to the cloud; pull updates from the cloud"),
  Bullet("Access control: time-bound JWT tokens gating sync, issued on M-Pesa payment"),
  Bullet("M-Pesa integration: STK Push initiation, callback handling, idempotent receipt processing"),
  Bullet("Access log and basic audit trail of payments and sync windows"),

  H2("2.3 User classes and characteristics"),
  tableFromRows([
    ["User class", "Description", "Primary device", "Technical literacy"],
    ["School Admin", "Owns or runs the school. Manages users, students, oversight.", "Desktop (Electron)", "Moderate"],
    ["Teacher", "Captures attendance, may eventually capture grades.", "Phone (Android)", "Variable; assume low"],
    ["Finance Officer", "Tracks payments, fees, reconciliations.", "Desktop (Electron)", "Moderate to high"],
    ["Director (P2)", "Read-only oversight. Wants dashboards, not data entry.", "Phone or web", "Low to moderate"],
    ["System Administrator", "Operates the cloud deployment. (Internal, not a customer role.)", "Web console", "High"],
  ], [1700, 3300, 2200, 2160]),

  H2("2.4 Operating environment"),
  Bullet("**Desktop**: Windows 10/11 (64-bit primary), macOS 12+ (secondary), Linux x64 (best-effort). Minimum 4 GB RAM, 500 MB disk."),
  Bullet("**Mobile**: Android 9+ (API level 28+). Minimum 2 GB RAM, ~200 MB storage. iOS support is P2."),
  Bullet("**Server**: Node.js 20+ on Linux containers (Cloud Run base image)."),
  Bullet("**Database**: PostgreSQL 16 (managed via Cloud SQL in production)."),
  Bullet("**Sync**: PowerSync managed service."),
  Bullet("**Connectivity**: any operation other than sync must succeed with no network. Sync requires HTTPS to the API and Daraja."),

  H2("2.5 Design and implementation constraints"),
  Bullet("UUID v7 for every primary key (sync conflict prevention) — **hard constraint**"),
  Bullet("`schoolId` field on every entity — **hard constraint**"),
  Bullet("`packages/core-logic` may not import from any framework — **hard constraint**"),
  Bullet("All API request validation must use Zod schemas defined in core-logic"),
  Bullet("TypeScript strict mode across the monorepo"),
  Bullet("All HTTP endpoints must accept and validate `X-School-ID`"),
  Bullet("Secrets only via environment variables; never in source"),
  Bullet("African-region data residency: GCP africa-south1 (Johannesburg) for MVP onward"),

  H2("2.6 Assumptions and dependencies"),
  Bullet("Safaricom Daraja sandbox is available and behaves consistently for the prototype demo window"),
  Bullet("PowerSync continues to support PostgreSQL → SQLite replication on its free or low tier"),
  Bullet("Pilot school(s) provide a representative low-end Android device for performance testing during MVP"),
  Bullet("The project sponsor secures live Daraja credentials before MVP launch"),
  Bullet("GCP africa-south1 quotas are sufficient for the MVP load (small)"),
]);

// ===== 3. EXTERNAL INTERFACE REQUIREMENTS =====
sections.push([
  H1("3. External Interface Requirements"),

  H2("3.1 User interfaces"),

  H3("3.1.1 Desktop (Electron + React)"),
  Bullet("Login screen — email/phone + password"),
  Bullet("Top navigation: Dashboard, Students, Users, Access Log, Settings"),
  Bullet("Dashboard: today's attendance summary, recent syncs, active access tokens count"),
  Bullet("Students screen: list, search, add, edit, archive"),
  Bullet("Users screen: list, add, role assignment, deactivate"),
  Bullet("Access Log screen: chronological list of payments and access windows, filterable by user and date"),
  Bullet("Settings screen: school profile, sync mode (cloud-connected vs standalone — P1), default class assignments"),

  H3("3.1.2 Mobile (Expo, Android)"),
  Bullet("Login screen — phone + password"),
  Bullet("Class roster screen — list of students in teacher's assigned class"),
  Bullet("Attendance capture — tap each student to cycle Present → Absent → Late"),
  Bullet("Sync button — visible on every screen, shows access status (e.g., \"Day pass — 4 hrs left\")"),
  Bullet("M-Pesa payment modal — pass selection (day/week/month), confirm phone number, initiate STK Push"),
  Bullet("Payment status modal — \"Waiting for confirmation…\" with cancel option"),

  H3("3.1.3 UX principles"),
  Bullet("Every screen must render usefully within 200 ms after navigation on a 2 GB RAM Android device"),
  Bullet("Critical actions (sync, attendance capture) must require no more than 2 taps from the home screen"),
  Bullet("Error messages must state what to do, not what went wrong (e.g., \"Pay KES 10 to sync today\" not \"402 Payment Required\")"),

  H2("3.2 Hardware interfaces"),
  Bullet("Standard Android touchscreen and biometric (fingerprint) if present (P1)"),
  Bullet("Desktop keyboard and mouse / trackpad"),
  Bullet("No specialised hardware required"),

  H2("3.3 Software interfaces"),

  H3("3.3.1 Safaricom Daraja API"),
  Bullet("Endpoint: `https://sandbox.safaricom.co.ke` (prototype) → `https://api.safaricom.co.ke` (MVP live)"),
  Bullet("OAuth: Daraja consumer key/secret exchanged for a bearer token (cached, refreshed before expiry)"),
  Bullet("STK Push initiate: `POST /mpesa/stkpush/v1/processrequest`"),
  Bullet("Callback receiver: our own HTTPS endpoint `POST /payments/callback`"),
  Bullet("Idempotency: callback `MpesaReceiptNumber` is unique-indexed in the `payments` table; duplicate callbacks are accepted and ignored"),

  H3("3.3.2 PowerSync"),
  Bullet("Sync rules expressed in YAML, filtering every replicated table by `school_id`"),
  Bullet("Client SDK on Electron and Expo; server-side connector to PostgreSQL"),
  Bullet("Replication is two-way (P1); prototype demonstrates one-way push only"),

  H3("3.3.3 Cloud SQL (PostgreSQL)"),
  Bullet("Private IP within VPC (MVP)"),
  Bullet("RLS policies enabled on every tenant-scoped table"),
  Bullet("Backups: automated daily, 7-day retention (MVP)"),

  H3("3.3.4 GCP Cloud Run"),
  Bullet("NestJS image deployed as a service, region `africa-south1`"),
  Bullet("Min instances 0 (scale to zero), max 5 for MVP"),
  Bullet("Environment variables sourced from Secret Manager"),

  H2("3.4 Communications interfaces"),
  Bullet("TLS 1.2 minimum (1.3 preferred) for all HTTPS traffic"),
  Bullet("WebSocket (Socket.IO) for real-time `access:granted` event after M-Pesa callback"),
  Bullet("REST/JSON for all other API traffic; payloads validated against Zod schemas"),
]);

// ===== 4. FUNCTIONAL REQUIREMENTS =====
sections.push([
  H1("4. Functional Requirements"),
  P("Each requirement carries an ID, priority (P0 / P1 / P2), and acceptance summary. Detailed acceptance criteria live in the Product Backlog. The ID is the cross-reference key."),

  H2("4.1 Authentication and Session Management"),
  tableFromRows([
    ["ID", "Priority", "Requirement", "Acceptance summary"],
    ["FR-AUTH-001", "P0", "User can log in with phone (or email) and password", "Valid credentials issue a JWT; invalid credentials return 401"],
    ["FR-AUTH-002", "P0", "JWT access tokens expire in 15 minutes", "Token contains exp claim; API rejects expired tokens"],
    ["FR-AUTH-003", "P0", "Refresh tokens issued at login, valid 7 days", "Refresh endpoint returns new access token; refresh token rotation on use"],
    ["FR-AUTH-004", "P0", "Passwords stored as bcrypt hashes (cost ≥ 12)", "No plaintext password persisted; password reset wipes hash"],
    ["FR-AUTH-005", "P0", "Logout invalidates the refresh token server-side", "Subsequent refresh attempts return 401"],
    ["FR-AUTH-006", "P1", "Password reset via M-Pesa-registered phone (SMS OTP)", "OTP delivered in < 60s; expires in 5 min; max 3 attempts"],
    ["FR-AUTH-007", "P1", "First sync from a new device records deviceId; admin notified", "Admin sees new device in access log; can revoke"],
    ["FR-AUTH-008", "P2", "Biometric unlock on mobile after first password login", "Fingerprint or face unlock replaces password on subsequent sessions"],
  ], [1500, 800, 3500, 3560]),

  H2("4.2 Multi-Tenant Isolation"),
  tableFromRows([
    ["ID", "Priority", "Requirement", "Acceptance summary"],
    ["FR-TENANT-001", "P0", "Every API request must carry X-School-ID header", "Missing header → 400; invalid format → 400"],
    ["FR-TENANT-002", "P0", "TenantGuard validates X-School-ID against tenants table", "Unknown schoolId → 404; valid → schoolId attached to request"],
    ["FR-TENANT-003", "P0", "Every database query is filtered by schoolId at API layer", "No endpoint returns data from a different tenant"],
    ["FR-TENANT-004", "P0", "Every entity has a non-null schoolId column", "Migration enforces NOT NULL FK to tenants(id)"],
    ["FR-TENANT-005", "P1", "PostgreSQL RLS policies filter rows by schoolId", "Direct DB query without app_user_school setting returns 0 rows"],
    ["FR-TENANT-006", "P1", "PowerSync sync rules filter every stream by schoolId", "Client A cannot receive Client B's data via sync"],
  ], [1500, 800, 3500, 3560]),

  H2("4.3 School and User Management"),
  tableFromRows([
    ["ID", "Priority", "Requirement", "Acceptance summary"],
    ["FR-SCHOOL-001", "P0", "Admin can register a school (seed for prototype)", "School row created with UUID v7 id, tier='offline', flatFeeStatus='inactive'"],
    ["FR-SCHOOL-002", "P0", "Admin can add users (teacher, admin, finance)", "User created with role; phone validated as Kenyan format (+254… or 07…)"],
    ["FR-SCHOOL-003", "P0", "Admin can deactivate users", "Deactivated user cannot log in; existing data preserved"],
    ["FR-SCHOOL-004", "P1", "Admin can edit school profile (name, contact, flat-fee status)", "Changes propagate to clients on next sync"],
    ["FR-SCHOOL-005", "P1", "Admin can reset another user's password", "New temporary password emailed/SMS'd; forced change on first login"],
    ["FR-SCHOOL-006", "P2", "Self-service school sign-up flow", "Public landing page → email verification → first admin user created"],
  ], [1500, 800, 3500, 3560]),

  H2("4.4 Student Records"),
  tableFromRows([
    ["ID", "Priority", "Requirement", "Acceptance summary"],
    ["FR-STU-001", "P0", "Admin can add a student (name, grade, DOB, guardian phone)", "Created with UUID v7; appears in roster immediately (offline)"],
    ["FR-STU-002", "P0", "Admin can edit a student's profile", "Changes saved locally; queued for sync"],
    ["FR-STU-003", "P0", "Admin can archive a student (not hard-delete)", "Student no longer appears in active rosters; remains in history"],
    ["FR-STU-004", "P0", "Teacher sees the student list filtered to their assigned class(es)", "Class assignment determines visibility on mobile"],
    ["FR-STU-005", "P1", "Bulk import students from a CSV / spreadsheet template", "Validates rows; reports row-level errors; partial import allowed"],
    ["FR-STU-006", "P1", "Photo per student", "Stored locally first; uploaded on sync if access allows"],
    ["FR-STU-007", "P2", "Promote students at term/year rollover", "Bulk update of grade field with audit trail"],
  ], [1500, 800, 3500, 3560]),

  H2("4.5 Attendance"),
  tableFromRows([
    ["ID", "Priority", "Requirement", "Acceptance summary"],
    ["FR-ATT-001", "P0", "Teacher can take attendance for their class for today", "One row per student; status ∈ {present, absent, late}"],
    ["FR-ATT-002", "P0", "Attendance entries are saved locally without internet", "Roster persists across app restart"],
    ["FR-ATT-003", "P0", "Teacher can edit today's attendance until midnight local time", "After midnight, requires admin override (P1)"],
    ["FR-ATT-004", "P0", "Admin sees today's attendance summary on dashboard", "Counts of present/absent/late by class"],
    ["FR-ATT-005", "P1", "Attendance history viewable per student (last 30 days)", "Calendar-style view with status colour codes"],
    ["FR-ATT-006", "P1", "Late-entry workflow: teacher requests, admin approves", "Out-of-window edits flagged for approval"],
    ["FR-ATT-007", "P2", "Parent notification on absence", "SMS sent to guardianPhone after configurable threshold"],
  ], [1500, 800, 3500, 3560]),

  H2("4.6 Offline Operation"),
  tableFromRows([
    ["ID", "Priority", "Requirement", "Acceptance summary"],
    ["FR-OFFLINE-001", "P0", "All read operations work without network", "Cold-launch with airplane mode succeeds"],
    ["FR-OFFLINE-002", "P0", "All write operations except payment work without network", "Writes persist to SQLite; flagged dirty for sync"],
    ["FR-OFFLINE-003", "P0", "App detects connectivity changes and updates sync UI state", "Online/offline indicator reflects real state within 2s of change"],
    ["FR-OFFLINE-004", "P1", "Queued writes survive app restart and OS restart", "SQLite is the persistence layer; no in-memory queue"],
    ["FR-OFFLINE-005", "P1", "Standalone Electron mode (no cloud at all)", "Setting toggle disables sync; local-only deployment"],
  ], [1500, 800, 3500, 3560]),

  H2("4.7 Synchronisation"),
  tableFromRows([
    ["ID", "Priority", "Requirement", "Acceptance summary"],
    ["FR-SYNC-001", "P0", "User can trigger a push sync via a Sync button", "Dirty rows pushed; marked clean on 200 OK"],
    ["FR-SYNC-002", "P0", "Sync is blocked by AccessGuard if access token is invalid", "API returns 402 with body { code: ACCESS_EXPIRED, upgradeUrl: /pay }"],
    ["FR-SYNC-003", "P0", "Successful sync updates syncedAt on local rows", "Re-sync of clean rows is a no-op"],
    ["FR-SYNC-004", "P1", "Pull sync receives server-side changes", "Conflicting rows resolved last-write-wins per entity"],
    ["FR-SYNC-005", "P1", "Failed sync ops queue and retry with exponential backoff", "5xx errors backoff up to 5 min; user can force retry"],
    ["FR-SYNC-006", "P1", "Sync progress UI (n of m records)", "Shown during multi-record syncs"],
    ["FR-SYNC-007", "P2", "Selective sync (e.g., only this term's data on mobile)", "Reduces mobile storage and bandwidth"],
  ], [1500, 800, 3500, 3560]),

  H2("4.8 M-Pesa Payment and Access Tokens"),
  tableFromRows([
    ["ID", "Priority", "Requirement", "Acceptance summary"],
    ["FR-PAY-001", "P0", "User can choose a pass (day / week / month) on mobile", "Pricing shown matches role-based table"],
    ["FR-PAY-002", "P0", "App initiates STK Push via POST /payments/initiate", "API validates inputs; calls Daraja; returns pending status"],
    ["FR-PAY-003", "P0", "Daraja callback handled at POST /payments/callback", "Idempotent on MpesaReceiptNumber; updates payment row"],
    ["FR-PAY-004", "P0", "Successful payment issues an access token with correct duration", "validFrom = now; validUntil = now + duration; persisted and returned"],
    ["FR-PAY-005", "P0", "WebSocket emits access:granted to user's socket on issuance", "Client transitions from waiting → unlocked without polling"],
    ["FR-PAY-006", "P0", "Failed/cancelled payments are logged and surface to user", "User sees a clear failure message and a retry option"],
    ["FR-PAY-007", "P1", "User can view their own payment history", "Last 90 days, with M-Pesa receipt numbers"],
    ["FR-PAY-008", "P1", "Admin can issue manual access tokens (flat-fee, comp days)", "Requires admin role; logged with reason"],
    ["FR-PAY-009", "P2", "Auto-renew prompt N hours before token expiry", "Configurable per user"],
  ], [1500, 800, 3500, 3560]),

  H2("4.9 Access Enforcement"),
  tableFromRows([
    ["ID", "Priority", "Requirement", "Acceptance summary"],
    ["FR-ACC-001", "P0", "isAccessValid(token) in core-logic returns true iff validUntil > now AND token belongs to user", "Unit-tested with edge cases (exact-now, expired, future)"],
    ["FR-ACC-002", "P0", "AccessGuard checks user's most recent valid token before sync endpoints", "Cached for the request; not on every internal call"],
    ["FR-ACC-003", "P0", "Admins on active flat-fee plan bypass per-sync access check", "tenants.flatFeeStatus = 'active' AND user.role = 'admin' → allowed"],
    ["FR-ACC-004", "P1", "Access tokens are non-transferable across users", "userId must match JWT subject"],
    ["FR-ACC-005", "P1", "Token revocation by admin (e.g., suspended user)", "Sets validUntil = now; takes effect on next sync attempt"],
  ], [1500, 800, 3500, 3560]),

  H2("4.10 Audit and Logging"),
  tableFromRows([
    ["ID", "Priority", "Requirement", "Acceptance summary"],
    ["FR-AUDIT-001", "P0", "Access Log records every payment, token issuance, and sync window", "Visible to admin; immutable from the UI"],
    ["FR-AUDIT-002", "P1", "API request log retained for 30 days", "Cloud Logging; queryable by schoolId"],
    ["FR-AUDIT-003", "P1", "User-action audit trail (who edited what, when)", "Per-entity history table"],
  ], [1500, 800, 3500, 3560]),
]);

// ===== 5. NON-FUNCTIONAL REQUIREMENTS =====
sections.push([
  H1("5. Non-Functional Requirements"),

  H2("5.1 Performance"),
  tableFromRows([
    ["ID", "Priority", "Requirement"],
    ["NFR-PERF-001", "P0", "Cold launch on baseline Android (2 GB RAM): < 3 seconds to login screen"],
    ["NFR-PERF-002", "P0", "Navigation between screens: < 200 ms"],
    ["NFR-PERF-003", "P0", "Attendance capture: < 100 ms per student tap, no perceptible lag"],
    ["NFR-PERF-004", "P0", "API median response time (excluding sync payloads): < 200 ms p50, < 500 ms p95"],
    ["NFR-PERF-005", "P0", "M-Pesa STK Push round-trip (initiate → token issued): < 60 seconds end-to-end"],
    ["NFR-PERF-006", "P1", "Sync of 200 attendance records: < 5 seconds on 3G"],
  ], [1700, 800, 6860]),

  H2("5.2 Reliability"),
  tableFromRows([
    ["ID", "Priority", "Requirement"],
    ["NFR-REL-001", "P0", "App must not lose user-entered data on crash; SQLite write-ahead logging"],
    ["NFR-REL-002", "P0", "Daraja callback handling must be idempotent (duplicate callbacks → identical result, no double-issuance)"],
    ["NFR-REL-003", "P1", "Cloud Run service availability target: 99.5% rolling 30-day (MVP)"],
    ["NFR-REL-004", "P1", "Daily Cloud SQL backups; 7-day retention; tested restore quarterly"],
    ["NFR-REL-005", "P1", "API gracefully handles Daraja outages (5xx response includes \"try again later\"; no data corruption)"],
  ], [1700, 800, 6860]),

  H2("5.3 Security"),
  tableFromRows([
    ["ID", "Priority", "Requirement"],
    ["NFR-SEC-001", "P0", "All API traffic over TLS 1.2+"],
    ["NFR-SEC-002", "P0", "Passwords hashed with bcrypt cost ≥ 12; never logged"],
    ["NFR-SEC-003", "P0", "JWT signing key in environment variable; rotation supported (P1)"],
    ["NFR-SEC-004", "P0", "Daraja credentials never present in client bundles or git history"],
    ["NFR-SEC-005", "P0", "SQL injection prevented (ORM-only DB access; no string concatenation)"],
    ["NFR-SEC-006", "P0", "XSS prevented (React escapes by default; no dangerouslySetInnerHTML)"],
    ["NFR-SEC-007", "P1", "Daraja callback verified by source IP (Safaricom range) and payload signature"],
    ["NFR-SEC-008", "P1", "Rate limiting on auth endpoints (e.g., 10 attempts / 5 min / IP)"],
    ["NFR-SEC-009", "P1", "OWASP Top 10 review before MVP launch"],
    ["NFR-SEC-010", "P2", "Penetration test before first paying school"],
  ], [1700, 800, 6860]),

  H2("5.4 Usability"),
  Bullet("**Language**: English only for the prototype. Swahili localisation is P1."),
  Bullet("**Forgiving entry**: phone numbers accepted in either `+2547…` or `07…` form, normalised on save"),
  Bullet("**Recoverable actions**: archive (not delete), with undo for 5 seconds where applicable"),
  Bullet("**Empty states**: every list view shows guidance when empty (\"No students yet — add your first student\")"),
  Bullet("**Error copy** is action-oriented (\"Pay KES 10 to sync today\"), not status-code-oriented"),

  H2("5.5 Maintainability"),
  Bullet("Strict TypeScript; no `any` without an attached comment justifying it"),
  Bullet("Module structure follows NestJS feature-module convention; no circular dependencies"),
  Bullet("`core-logic` ≥ 80% unit-test coverage by line"),
  Bullet("Every exported function has JSDoc"),
  Bullet("Migrations are forward-only; no destructive down-migrations in production"),

  H2("5.6 Portability"),
  Bullet("Backend container image runs unmodified on Cloud Run, ECS Fargate, or local Docker"),
  Bullet("No GCP-specific code paths outside of `apps/api/src/infra/` (gated by env)"),
  Bullet("Sync engine abstraction in `core-logic` allows PowerSync → WatermelonDB swap with API-level changes only"),

  H2("5.7 Localisation"),
  Bullet("All KES amounts shown with thousands separator and `KES` prefix"),
  Bullet("Dates shown DD/MM/YYYY (Kenyan convention)"),
  Bullet("Times in East Africa Time (UTC+3), stored as UTC"),
  Bullet("Phone numbers normalised to E.164 (+254XXXXXXXXX) on save"),
]);

// ===== 6. SYSTEM FEATURES (USE CASES) =====
sections.push([
  H1("6. System Features (Use Cases)"),

  H2("6.1 UC-01 — Teacher captures daily attendance offline"),
  tableFromRows([
    ["Field", "Detail"],
    ["Primary actor", "Teacher"],
    ["Preconditions", "Teacher logged in on Expo app; class assigned; student roster cached locally"],
    ["Trigger", "Teacher opens app, selects today's class"],
    ["Main flow", "1. App shows class roster\n2. Teacher taps each student: Present → Absent → Late\n3. Teacher taps \"Save\"\n4. App writes rows to local SQLite (status, date, teacherId, schoolId)\n5. App shows confirmation"],
    ["Postconditions", "Attendance rows persisted locally; flagged dirty"],
    ["Alternate flows", "A1: Teacher edits a student already marked → cycles status. A2: Teacher closes app mid-capture → state restored on relaunch."],
    ["Exceptions", "None: this flow has no network dependency"],
  ], [1800, 7560]),

  H2("6.2 UC-02 — Teacher syncs and is prompted for payment"),
  tableFromRows([
    ["Field", "Detail"],
    ["Primary actor", "Teacher"],
    ["Preconditions", "Teacher has unsynced attendance; teacher has no valid access token; teacher's phone is online"],
    ["Trigger", "Teacher taps \"Sync\""],
    ["Main flow", "1. App calls POST /sync/push with X-School-ID + JWT\n2. API runs AccessGuard → 402 with { code: ACCESS_EXPIRED, upgradeUrl: /pay }\n3. App shows M-Pesa prompt: \"Sync access expired. Pay KES 10 for a day pass?\"\n4. Teacher confirms; selects pass; confirms phone\n5. App calls POST /payments/initiate → STK Push pending\n6. Teacher receives push on phone, enters PIN, confirms\n7. Daraja calls our callback; API issues access token; WebSocket emits access:granted\n8. App receives event; retries sync; sync succeeds"],
    ["Postconditions", "Attendance rows marked synced; access token persisted with validUntil"],
    ["Alternate flows", "A1: Teacher cancels payment → app dismisses modal, sync remains pending. A2: STK Push times out → app shows retry."],
    ["Exceptions", "E1: Daraja unavailable → 503 from API; app shows \"Mobile money is unavailable, try again shortly\""],
  ], [1800, 7560]),

  H2("6.3 UC-03 — Admin reviews access log"),
  tableFromRows([
    ["Field", "Detail"],
    ["Primary actor", "School Admin"],
    ["Preconditions", "Admin logged in on Electron app"],
    ["Trigger", "Admin opens \"Access Log\" from navigation"],
    ["Main flow", "1. App fetches access log (paginated, last 30 days default)\n2. Each row shows: user, pass, amount, M-Pesa receipt, validFrom, validUntil\n3. Admin filters by user (John) → list narrows\n4. Admin clicks a row → detail panel shows full payment metadata"],
    ["Postconditions", "No state change; read-only view"],
    ["Alternate flows", "A1: Admin exports filtered list as CSV (P1)"],
    ["Exceptions", "None"],
  ], [1800, 7560]),

  H2("6.4 UC-04 — Admin onboards a new teacher"),
  tableFromRows([
    ["Field", "Detail"],
    ["Primary actor", "School Admin"],
    ["Preconditions", "Admin logged in; admin has \"Users\" permission (admin role)"],
    ["Trigger", "Admin clicks \"Add User\""],
    ["Main flow", "1. Modal: name, phone, role (teacher), initial password\n2. App validates phone format and password strength\n3. POST /users → API creates row with UUID v7, schoolId attached automatically\n4. New user appears in users list; admin shares credentials out-of-band"],
    ["Postconditions", "User row exists; teacher can log in on Expo app"],
    ["Alternate flows", "A1: Admin assigns user to a class on creation (P1)"],
    ["Exceptions", "E1: Phone already exists for another user in same tenant → 409 Conflict; UI shows inline error"],
  ], [1800, 7560]),

  H2("6.5 UC-05 — System rejects cross-tenant access"),
  tableFromRows([
    ["Field", "Detail"],
    ["Primary actor", "Any authenticated user, attempting cross-tenant access (test scenario)"],
    ["Preconditions", "User has JWT issued for Tenant A"],
    ["Trigger", "API call to GET /students with X-School-ID = Tenant B's id"],
    ["Main flow", "1. TenantGuard validates X-School-ID format and existence → OK\n2. API extracts JWT.sub and resolves user → user.schoolId = Tenant A\n3. AccessGuard / RLS layer rejects: user.schoolId ≠ request.schoolId → 403 Forbidden"],
    ["Postconditions", "No data leaked; attempt logged"],
    ["Alternate flows", "None"],
    ["Exceptions", "None — this is the security guarantee"],
  ], [1800, 7560]),
]);

// ===== 7. DATA REQUIREMENTS =====
sections.push([
  H1("7. Data Requirements"),

  H2("7.1 Entities and key fields"),
  P("Common to every entity: `id UUID PRIMARY KEY` (UUID v7), `created_at TIMESTAMPTZ DEFAULT now()`, `updated_at TIMESTAMPTZ DEFAULT now()`, and (for tenant-scoped entities) `school_id UUID NOT NULL REFERENCES tenants(id)`."),

  H3("tenants"),
  tableFromRows([
    ["Column", "Type", "Notes"],
    ["id", "UUID", "PK; UUID v7"],
    ["school_name", "VARCHAR(255)", "NOT NULL"],
    ["tier", "VARCHAR(50)", "offline | sync-enabled; default 'offline'"],
    ["contact_name", "VARCHAR(255)", "Primary contact at the school"],
    ["contact_phone", "VARCHAR(20)", "E.164 format"],
    ["flat_fee_status", "VARCHAR(20)", "inactive | active | suspended; default 'inactive'"],
    ["created_at", "TIMESTAMPTZ", "default now()"],
  ], [2200, 2000, 5160]),

  H3("users"),
  tableFromRows([
    ["Column", "Type", "Notes"],
    ["id", "UUID", "PK; UUID v7"],
    ["school_id", "UUID", "FK → tenants(id); NOT NULL"],
    ["name", "VARCHAR(255)", "NOT NULL"],
    ["phone", "VARCHAR(20)", "E.164; UNIQUE within tenant"],
    ["email", "VARCHAR(255)", "Optional; UNIQUE within tenant if present"],
    ["role", "VARCHAR(50)", "teacher | admin | finance"],
    ["password_hash", "VARCHAR(255)", "bcrypt"],
    ["device_id", "VARCHAR(255)", "Recorded on first sync; nullable"],
    ["is_active", "BOOLEAN", "default true"],
    ["created_at", "TIMESTAMPTZ", "default now()"],
  ], [2200, 2000, 5160]),

  H3("access_tokens"),
  tableFromRows([
    ["Column", "Type", "Notes"],
    ["id", "UUID", "PK; UUID v7"],
    ["user_id", "UUID", "FK → users(id); NOT NULL"],
    ["school_id", "UUID", "FK → tenants(id); NOT NULL"],
    ["role", "VARCHAR(50)", "Snapshot of user.role at issuance"],
    ["valid_from", "TIMESTAMPTZ", "NOT NULL"],
    ["valid_until", "TIMESTAMPTZ", "NOT NULL; indexed"],
    ["payment_ref", "VARCHAR(255)", "MpesaReceiptNumber or 'flat-fee:<period>'"],
    ["created_at", "TIMESTAMPTZ", "default now()"],
  ], [2200, 2000, 5160]),

  H3("students"),
  tableFromRows([
    ["Column", "Type", "Notes"],
    ["id", "UUID", "PK; UUID v7"],
    ["school_id", "UUID", "FK → tenants(id); NOT NULL"],
    ["name", "VARCHAR(255)", "NOT NULL"],
    ["grade", "VARCHAR(50)", "e.g., 'Grade 4'"],
    ["date_of_birth", "DATE", "Optional"],
    ["guardian_phone", "VARCHAR(20)", "E.164"],
    ["is_archived", "BOOLEAN", "default false"],
    ["created_at", "TIMESTAMPTZ", "default now()"],
  ], [2200, 2000, 5160]),

  H3("attendance"),
  tableFromRows([
    ["Column", "Type", "Notes"],
    ["id", "UUID", "PK; UUID v7"],
    ["school_id", "UUID", "FK → tenants(id); NOT NULL"],
    ["student_id", "UUID", "FK → students(id)"],
    ["teacher_id", "UUID", "FK → users(id)"],
    ["date", "DATE", "NOT NULL"],
    ["status", "VARCHAR(20)", "present | absent | late"],
    ["note", "TEXT", "Optional"],
    ["synced_at", "TIMESTAMPTZ", "Nullable; set on successful sync"],
    ["created_at", "TIMESTAMPTZ", "default now()"],
  ], [2200, 2000, 5160]),

  H3("payments"),
  tableFromRows([
    ["Column", "Type", "Notes"],
    ["id", "UUID", "PK; UUID v7"],
    ["school_id", "UUID", "FK → tenants(id); NOT NULL"],
    ["user_id", "UUID", "FK → users(id); NOT NULL"],
    ["amount_kes", "INTEGER", "NOT NULL; ≥ 0"],
    ["pass", "VARCHAR(10)", "day | week | month"],
    ["mpesa_receipt", "VARCHAR(255)", "UNIQUE; nullable until callback"],
    ["status", "VARCHAR(20)", "pending | success | failed | cancelled"],
    ["initiated_at", "TIMESTAMPTZ", "default now()"],
    ["completed_at", "TIMESTAMPTZ", "Nullable"],
  ], [2200, 2000, 5160]),

  H2("7.2 Indexes"),
  Bullet("`users(school_id)`"),
  Bullet("`users(phone)` UNIQUE within school"),
  Bullet("`students(school_id)`, `students(school_id, grade)`"),
  Bullet("`attendance(school_id, date)`, `attendance(student_id, date)`"),
  Bullet("`access_tokens(user_id, valid_until DESC)`"),
  Bullet("`payments(mpesa_receipt)` UNIQUE"),

  H2("7.3 Retention"),
  Bullet("Attendance records: retained indefinitely (P0); soft-archive option for old academic years (P2)"),
  Bullet("Audit log: 12 months (P1)"),
  Bullet("Failed payment rows: 90 days then anonymised (P1)"),
]);

// ===== 8. API SURFACE =====
sections.push([
  H1("8. API Surface (Prototype P0)"),
  P("All endpoints require `X-School-ID` and (except `/auth/*` and `/payments/callback`) a Bearer JWT. Sync endpoints additionally pass through `AccessGuard`. Successful responses return 200 with JSON body unless stated. Validation failures return 400 with `{ code, message, details }`."),
  tableFromRows([
    ["Method + Path", "Purpose", "Auth", "Body / Notes"],
    ["POST /auth/login", "Exchange phone+password for JWT", "None", "{ phone, password } → { accessToken, refreshToken }"],
    ["POST /auth/refresh", "Refresh access token", "Refresh token", "{ refreshToken } → { accessToken }"],
    ["POST /auth/logout", "Invalidate refresh token", "JWT", "—"],
    ["GET /tenants/me", "Fetch own tenant profile", "JWT + Tenant", "—"],
    ["GET /users", "List users in tenant", "JWT + Tenant", "—"],
    ["POST /users", "Create user (admin only)", "JWT + Tenant + Admin", "{ name, phone, role, password }"],
    ["PATCH /users/:id", "Update user", "JWT + Tenant + Admin", "Partial body"],
    ["GET /students", "List students", "JWT + Tenant", "Query: grade, search, page"],
    ["POST /students", "Add student", "JWT + Tenant + Admin", "{ name, grade, dob?, guardianPhone? }"],
    ["PATCH /students/:id", "Edit student", "JWT + Tenant + Admin", "Partial body"],
    ["GET /attendance", "List attendance (filterable)", "JWT + Tenant", "Query: date, studentId, classId"],
    ["POST /attendance", "Bulk submit attendance for a class", "JWT + Tenant", "[ { studentId, date, status, note? } ]"],
    ["POST /payments/initiate", "Start STK Push", "JWT + Tenant", "{ pass, phone? }"],
    ["POST /payments/callback", "Daraja callback (idempotent)", "None (IP/signature)", "Daraja payload"],
    ["GET /payments", "Own payment history", "JWT + Tenant", "—"],
    ["GET /access-log", "Access log for tenant (admin)", "JWT + Tenant + Admin", "Query: userId, from, to, page"],
    ["POST /sync/push", "Push dirty rows from client", "JWT + Tenant + Access", "{ tables: { … } }"],
    ["GET /sync/pull", "Pull changes (P1)", "JWT + Tenant + Access", "Query: since"],
  ], [2500, 2200, 1800, 2860]),
]);

// ===== 9. VALIDATION & TEST APPROACH =====
sections.push([
  H1("9. Validation and Test Approach"),

  H2("9.1 Test pyramid"),
  Bullet("**Unit tests** (Jest): every function in `core-logic`; controllers and services in `apps/api`; reducers / hooks in clients"),
  Bullet("**Integration tests** (Supertest + Postgres in Docker): API endpoints exercised against real DB"),
  Bullet("**End-to-end (P1)**: Detox on Android, Playwright on Electron"),
  Bullet("**Smoke tests**: a scripted run of the demo scenarios after every deploy (MVP)"),

  H2("9.2 Coverage targets"),
  Bullet("`core-logic`: ≥ 80% line coverage (P0)"),
  Bullet("`apps/api`: ≥ 60% line coverage on services and guards (P0)"),
  Bullet("Clients: ≥ 40% on reducers, ≥ 60% on shared hooks (P1)"),

  H2("9.3 Acceptance test cases (sample)"),
  tableFromRows([
    ["ID", "Test", "Linked requirement"],
    ["TC-001", "Login with valid credentials returns JWT; invalid returns 401", "FR-AUTH-001"],
    ["TC-002", "POST /students with missing X-School-ID returns 400", "FR-TENANT-001"],
    ["TC-003", "POST /students from Tenant A's JWT but Tenant B's header returns 403", "FR-TENANT-003, UC-05"],
    ["TC-004", "POST /sync/push with no valid access token returns 402 with { code: ACCESS_EXPIRED }", "FR-SYNC-002, FR-ACC-002"],
    ["TC-005", "Daraja callback for same MpesaReceiptNumber twice issues exactly one access token", "FR-PAY-003, NFR-REL-002"],
    ["TC-006", "isAccessValid(token) where validUntil = now returns false", "FR-ACC-001"],
    ["TC-007", "Mobile app cold launch on 2 GB Android < 3s to login screen", "NFR-PERF-001"],
    ["TC-008", "Mobile app captures attendance with airplane mode on; survives restart", "FR-OFFLINE-001, FR-OFFLINE-004"],
    ["TC-009", "M-Pesa round-trip end-to-end < 60s on sandbox", "NFR-PERF-005"],
    ["TC-010", "Admin with flatFeeStatus=active bypasses 402 on sync", "FR-ACC-003"],
  ], [1100, 5500, 2760]),

  H2("9.4 Exit criteria for prototype"),
  Bullet("All P0 functional requirements pass acceptance tests"),
  Bullet("All P0 NFRs measured and within target"),
  Bullet("Demo scenarios A–E (in Blueprint Section 13) run end-to-end without manual intervention"),
  Bullet("Internal dry-run held; stakeholder demo dated and scheduled"),
]);

// ===== 10. CHANGE CONTROL =====
sections.push([
  H1("10. Change Control"),
  P("Changes to this SRS go through a single channel: a pull request against the document repository (or, in early prototype, an explicit message from the project sponsor)."),
  Bullet("**Adds** (new requirement) — keep the existing ID range, assign the next available tag"),
  Bullet("**Modifies** (changes acceptance summary) — bump the document version, keep the ID"),
  Bullet("**Drops** (requirement removed) — mark the ID as `[DROPPED in vX.Y]`; do not reuse"),
  Bullet("**Re-priorities** (P0 → P1 etc.) — recorded in the change log"),

  H2("10.1 Change log"),
  tableFromRows([
    ["Version", "Date", "Author", "Summary"],
    ["0.1", new Date().toISOString().slice(0, 10), "Product owner", "Initial draft based on the original handoff document and stakeholder briefing"],
  ], [1500, 2000, 2800, 3060]),
]);

const doc = buildDocument({
  title: "Software Requirements Specification",
  subtitle: "SRS · Prototype + MVP Phases",
  sections,
});

const outPath = path.join(__dirname, "..", "docs", "02-SRS.docx");
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outPath, buf);
  console.log("Wrote", outPath, "(", buf.length, "bytes )");
});
