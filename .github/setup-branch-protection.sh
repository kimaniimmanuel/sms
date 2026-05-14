#!/usr/bin/env bash
#
# Apply branch protection to `main` for this repository.
#
# Two modes:
#   * Default (solo-builder): structural protections only — no required
#     reviewers (you can't approve your own PR via CODEOWNERS).
#   * TIGHTEN=true: full team mode — 1 required approval and CODEOWNERS review.
#
# Prerequisites:
#   1. The GitHub CLI (`gh`) is installed and authenticated.
#        winget install GitHub.cli   # Windows
#        brew install gh             # macOS
#        gh auth login
#   2. You have admin rights on the repository.
#   3. The repository has at least one commit on `main`.
#
# Usage:
#   ./setup-branch-protection.sh                     # auto-detect repo from `gh`
#   ./setup-branch-protection.sh org/repo            # explicit
#   TIGHTEN=true ./setup-branch-protection.sh        # team mode (after first hire)
#
# Idempotent: safe to re-run.
#
# To revert (open up the branch again):
#   gh api -X DELETE repos/$REPO/branches/main/protection

set -euo pipefail

REPO="${1:-$(gh repo view --json nameWithOwner -q .nameWithOwner)}"
MODE="${TIGHTEN:-false}"

echo "Applying branch protection to ${REPO} (branch: main)"
echo "Mode: $([ "$MODE" = "true" ] && echo "TIGHTEN (team)" || echo "DEFAULT (solo)")"
echo ""

if [ "$MODE" = "true" ]; then
  # Team mode: full review enforcement
  REVIEW_BLOCK='{
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true,
    "required_approving_review_count": 1,
    "require_last_push_approval": true
  }'
else
  # Solo mode: PRs required but no approvals (you can't approve your own PR)
  REVIEW_BLOCK='{
    "dismiss_stale_reviews": false,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 0,
    "require_last_push_approval": false
  }'
fi

PAYLOAD=$(cat <<JSON
{
  "required_status_checks": null,
  "enforce_admins": false,
  "required_pull_request_reviews": ${REVIEW_BLOCK},
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": true,
  "lock_branch": false,
  "allow_fork_syncing": false
}
JSON
)

echo "$PAYLOAD" | gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  "repos/${REPO}/branches/main/protection" \
  --input -

echo ""
echo "Branch protection applied to ${REPO}:main"
echo ""
echo "Effective rules:"
echo "  • PRs required (no direct push to main)"
echo "  • Linear history (squash or rebase only)"
echo "  • Force-push blocked"
echo "  • Branch deletion blocked"
echo "  • Outstanding conversations must be resolved before merge"
if [ "$MODE" = "true" ]; then
  echo "  • At least 1 approving review"
  echo "  • Stale reviews dismissed on new commits"
  echo "  • CODEOWNERS review required"
  echo "  • Approval must be on the last push"
else
  echo "  • Approval count: 0 (solo-builder default — re-run with TIGHTEN=true to enforce)"
fi
echo ""
echo "Next steps:"
echo "  1. When you wire up CI, add required status check contexts:"
echo "       gh api repos/${REPO}/branches/main/protection/required_status_checks/contexts \\"
echo "         --method POST -f 'contexts[]=ci/lint' -f 'contexts[]=ci/test'"
if [ "$MODE" != "true" ]; then
  echo "  2. When you hire your first collaborator, re-run with TIGHTEN=true:"
  echo "       TIGHTEN=true ./.github/setup-branch-protection.sh"
fi
