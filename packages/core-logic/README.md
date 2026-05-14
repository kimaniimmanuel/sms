# @sms/core-logic

Framework-agnostic shared business logic for the SMS project.

**Hard rule:** this package must not import from any framework (NestJS, React,
Expo, Electron, or runtime-specific Node APIs). It is consumed identically by
the API and the clients, so anything platform-specific belongs elsewhere.

## What lives here (planned, Epic E2)

| Path | Purpose |
|------|---------|
| `src/utils/uuid.ts` | `newId()` returning UUID v7 (sync-safe time-ordered IDs) |
| `src/utils/date.ts` | `termFromDate()` for Kenyan school calendar |
| `src/schemas/*.ts` | Zod schemas: `TenantSchema`, `UserSchema`, `StudentSchema`, `AccessTokenSchema` |
| `src/rules/access.ts` | `isAccessValid()`, `accessDurationHours()`, `priceKES()` |
| `src/types/index.ts` | Re-exports of inferred Zod types |

## Coverage target

≥ 80% line coverage (FR-ACC-001 and related correctness requirements depend on
this being right everywhere).
