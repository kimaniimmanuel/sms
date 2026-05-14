# GitHub setup notes

This folder contains the GitHub-side governance artefacts for the repo. The
project is currently a solo build, so the defaults are tuned for one person —
PR discipline without forcing you to wait on a non-existent second reviewer.

Read this when you first create the repository on GitHub, again when adding
collaborators, and again when you start hiring.

## What is in here

| File | Purpose |
|------|---------|
| `CODEOWNERS` | Auto-requests review when matching files change (today: just you) |
| `PULL_REQUEST_TEMPLATE.md` | Prefilled body for every new PR |
| `ISSUE_TEMPLATE/config.yml` | Disables blank issues; surfaces a security email and discussions link |
| `ISSUE_TEMPLATE/bug_report.md` | Template for bug reports |
| `ISSUE_TEMPLATE/feature_request.md` | Template for new feature ideas |
| `ISSUE_TEMPLATE/user_story.md` | Template for porting backlog stories into GitHub Issues |
| `setup-branch-protection.sh` | Idempotent script that applies solo-builder branch protection to `main` |
| `SETUP.md` | This file |

## Placeholders to replace

Before the first PR is opened, do a global find-and-replace for these tokens:

| Token | Replace with |
|-------|--------------|
| `@PROJECT-OWNER` | Your personal GitHub handle |
| `REPLACE-ORG` | The GitHub organisation slug (e.g. `sms-co-ke`) |
| `REPLACE-REPO` | The repository slug (e.g. `sms-app`) |
| `REPLACE-DOMAIN` | Your registered domain (e.g. `sms.co.ke`) |
| `[Company Name TBD]` (in `LICENSE`) | The registered company name |
| `[contact email TBD]` (in `LICENSE`) | A real contact mailbox |

A single ripgrep pass will find them all:

```bash
rg -n 'PROJECT-OWNER|REPLACE-ORG|REPLACE-REPO|REPLACE-DOMAIN|TBD'
```

## First-time setup, in order

1. **Create the GitHub organisation** (not a personal account). Free tier is
   fine to start. Solo today, but the org makes it painless to add
   collaborators, transfer ownership, or sell the company later.
2. **Create the private repository** inside the org.
3. **Push this initial commit** containing the `docs/` folder, `.github/`,
   `.gitignore`, `.editorconfig`, `.nvmrc`, `README.md`, and `LICENSE`.
4. **Replace the placeholders** above and commit.
5. **Run the branch protection script**:
   ```bash
   ./.github/setup-branch-protection.sh
   ```
   The script auto-detects the repo from `gh`; pass `org/repo` to override.
6. **Enable Discussions** in repo settings (Settings → Features → Discussions).
   Useful even solo for keeping decision threads searchable.
7. **(Skip until your first hire)** Add collaborators with the `Maintain` role.

## Solo-builder workflow

You are the only reviewer. That means the discipline of "don't merge your own
PR" cannot apply mechanically. Instead, **use PRs as a self-review tool**:

- Branch for every change (`feat/...`, `fix/...`, `chore/...`).
- Open a PR even though no one else will review it.
- Re-read the diff with fresh eyes — ideally a few hours or a day later.
- Run the test suite and any manual verification before merging.
- Squash-merge into `main`. The squash commit message becomes your changelog.

Why bother when nobody else is looking? Because:
- PRs create searchable history (what changed, when, why).
- Self-review with a delay catches surprising amounts.
- It builds the muscle for when you do have reviewers.
- If you later ship something dangerous, the PR is your rollback unit.

## Branch protection — solo-builder defaults

The initial script applies these rules to `main`:

- **No direct push** — every change goes through a PR (even solo).
- **Linear history** — squash or rebase, no merge commits.
- **No force-push** — history stays immutable.
- **No branch deletion** — `main` cannot disappear by accident.
- **Conversation resolution required** — your own PR comments must be resolved before merge.
- **CODEOWNERS review required**: ❌ disabled by default (you can't review your own PR via CODEOWNERS).
- **Required approving reviews**: ❌ count = 0 by default (would block solo merges).
- **Status checks required**: ❌ not yet wired (no CI exists yet).

The result: you keep the structural protections (history, no force-push) but
can still merge your own PRs.

## When you hire — tighten the rules

When the first collaborator joins, run these to tighten:

```bash
# Re-run the script with the TIGHTEN env var to require 1 approval and code-owner review
TIGHTEN=true ./.github/setup-branch-protection.sh

# After CI is wired up, add required status checks:
gh api repos/<org>/<repo>/branches/main/protection/required_status_checks/contexts \
  --method POST -f 'contexts[]=ci/lint' -f 'contexts[]=ci/test'
```

The `TIGHTEN=true` mode flips on:
- `required_approving_review_count: 1`
- `require_code_owner_reviews: true`

You should also at that point:
- Update `CODEOWNERS` to add the collaborator's handle to the relevant paths.
- Switch CODEOWNERS to a GitHub team handle once you have more than two people.

## Reverting branch protection

If you ever need to open the branch back up (emergency revert):

```bash
gh api -X DELETE repos/<org>/<repo>/branches/main/protection
```

Re-apply by re-running `setup-branch-protection.sh`.

## Conventions worth knowing

- **Issue titles** use the type marker the templates set up: `[Bug]`,
  `[Feature]`, or `US-EX-NNN` for backlog stories.
- **PR titles** are imperative, under 70 characters: "Add TenantGuard to
  /students controller" rather than "Adding tenant guard...".
- **Branch names** are `feat/<short>`, `fix/<short>`, `chore/<short>`,
  `docs/<short>`. Keep them short.
- **Squash on merge** is the default. The squashed message becomes the
  permanent history; write it with care.
- **Decision log**: use GitHub Discussions or a `#decisions` Slack channel to
  capture why you chose X over Y. Solo today, but you will thank yourself
  later when revisiting an old decision.
