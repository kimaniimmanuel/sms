<!--
  PR title: keep under 70 characters. Use imperative mood.
    Good: "Add TenantGuard to /students controller"
    Bad:  "Adding tenant guard for students endpoint (fixes #42)"
-->

## Summary

<!-- One or two sentences. What does this PR do? -->

## Why

<!--
  The business or technical reason. Link the user story or SRS requirement.
  Example: Implements US-E5-001 (FR-TENANT-001). Stakeholder demo Scenario E
  depends on this.
-->

## Linked work

- Story: <!-- US-EX-NNN -->
- SRS requirement(s): <!-- FR-XXX-NNN -->
- Issue: <!-- #N if applicable -->

## Test plan

<!--
  How you verified this works. Be specific. "Tested locally" is not enough.
  Example:
    - [x] Unit test added in apps/api/test/tenant.guard.spec.ts
    - [x] Manual: curl POST /students without X-School-ID → 400
    - [x] Manual: curl POST /students with valid schoolId → 201
-->

- [ ]
- [ ]

## Screenshots / recordings

<!-- Required for any UI change. Drag images into this PR description. -->

## Pre-merge checklist

- [ ] Linked to a backlog story (or explicit reason none exists)
- [ ] Tests added or updated; `pnpm test` passes locally
- [ ] `pnpm lint` and `pnpm typecheck` pass
- [ ] No secrets, API keys, or `.env` values committed
- [ ] Migrations are forward-only (no destructive `down` in production)
- [ ] Docs updated if API surface or env vars changed
- [ ] Hard rules respected: UUID v7, schoolId on every entity, core-logic stays framework-agnostic

## Risk and rollback

<!--
  What is the blast radius if this PR is wrong? How would we roll back?
  For prototype-phase work, "revert PR" is usually enough — say so explicitly
  rather than leaving the section blank.
-->
