# @sms/api

NestJS multi-tenant backend for the SMS project. **Placeholder — fleshed out in Epic E3+.**

Planned modules:

- `common/guards/` — `TenantGuard`, `AccessGuard`
- `common/decorators/` — `@CurrentUser()`, `@SchoolId()`
- `auth/` — JWT login + refresh + logout
- `tenant/` — tenant lookup, request-scoped context
- `users/`, `students/`, `attendance/`
- `payments/` — Daraja STK Push, callback handler, idempotent token issuance
- `sync/` — push endpoint (P0), pull endpoint (P1)

See `docs/02-SRS.docx` for the authoritative requirements list and
`docs/03-Product-Backlog.docx` for the story-level breakdown.
