# SMS — School Management System

Local-first, multi-tenant SaaS for Kenyan schools.
Offline-capable. Sync funded by M-Pesa micro-payments.

**Status:** prototype phase (pre-code).

## Documents

The full project blueprint, requirements specification, backlog, and pre-coding
setup checklist live in [`docs/`](./docs):

- [`00-Pre-Coding-Setup-Checklist.docx`](./docs/00-Pre-Coding-Setup-Checklist.docx) — what to set up before writing code
- [`01-Project-Blueprint.docx`](./docs/01-Project-Blueprint.docx) — stakeholder-facing vision, scope, and timeline
- [`02-SRS.docx`](./docs/02-SRS.docx) — Software Requirements Specification
- [`03-Product-Backlog.docx`](./docs/03-Product-Backlog.docx) — epics, user stories, acceptance criteria

## Stack

- Monorepo: Turborepo + pnpm
- Backend: NestJS + PostgreSQL
- Desktop: React + Electron
- Mobile: React Native (Expo, Android first)
- Shared: `packages/core-logic` (TypeScript + Zod)
- Sync: PowerSync (SQLite ↔ Postgres)
- Cloud: GCP Cloud Run + Cloud SQL, `africa-south1`

## Hard rules

1. UUID v7 everywhere — no auto-increment IDs.
2. `schoolId` on every entity — multi-tenant isolation.
3. `core-logic` is framework-agnostic.
4. Offline-first: every feature except sync must work without internet.
5. Electron supports a standalone (cloud-disconnected) mode.

## Getting started

Code does not exist yet. Once scaffolding lands, this section will cover:

```bash
pnpm install
docker compose up -d postgres
pnpm dev
```

## License

Proprietary — see [LICENSE](./LICENSE).
