#!/usr/bin/env bash
# Merge the upstream fork branch into this fork without hand-resolving.
#
# Resolving is per path, never with a merge strategy option: `-X ours` answered
# every conflict the same way, so a file the fork never meant to change stayed
# at whatever copy an older merge left behind. That drift is what eventually
# dropped upstream's SemanticDiffError exports and broke the bundle.
#
# FORK_PATHS keep the fork's side; everything else takes upstream. The workflow
# still refuses to push a tree with duplicate YAML keys, conflict markers, or a
# package.json missing an entry upstream declares.
set -euo pipefail

UPSTREAM="${UPSTREAM:-seatedro/t3code}"
BRANCH="${BRANCH:-rohit/changes}"
OUTPUT="${GITHUB_OUTPUT:-}"

# Paths this fork owns. A trailing slash marks a directory. Only add a path
# after checking the fork really needs to diverge in it.
FORK_PATHS=$(cat <<'EOF'
.github/workflows/fork-release.yml
.github/workflows/release-desktop.yml
.github/workflows/sync-upstream.yml
assets/flock/
apps/desktop/src/app/DesktopEnvironment.ts
apps/mobile/src/features/settings/environment-maintenance.test.ts
apps/server/src/cli/update.test.ts
apps/server/src/mcp/OrchestratorMcpService.test.ts
apps/server/src/provider/agentContextBudget.json
apps/server/src/scheduledTasks/ScheduledTaskService.test.ts
apps/web/src/components/T3Wordmark.tsx
apps/web/src/components/sidebar/UpdateEverythingDialog.tsx
apps/web/src/state/npmRelease.test.ts
apps/web/src/state/npmRelease.ts
packages/shared/src/cliRelease.ts
scripts/lib/fork-brand.test.ts
scripts/lib/fork-brand.ts
EOF
)

set_output() {
  if [ -n "$OUTPUT" ]; then
    echo "$1" >> "$OUTPUT"
  fi
}

is_fork_path() {
  local path="$1" owned
  while IFS= read -r owned; do
    [ -z "$owned" ] && continue
    if [ "${owned%/}" != "$owned" ]; then
      [[ "$path" == "$owned"* ]] && return 0
    else
      [[ "$path" == "$owned" ]] && return 0
    fi
  done <<< "$FORK_PATHS"
  return 1
}

# Resolve one side of a path, including the add/delete cases where that side
# has no blob: stage 2 is ours, stage 3 is theirs.
take_side() {
  local side="$1" path="$2" stage=2
  [ "$side" = theirs ] && stage=3
  if git cat-file -e ":$stage:$path" 2>/dev/null; then
    git checkout --"$side" -- "$path"
    git add -- "$path"
  else
    git rm -q -f -- "$path" 2>/dev/null || true
  fi
}

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git remote add upstream "https://github.com/$UPSTREAM.git" 2>/dev/null || true
git fetch --no-tags upstream "$BRANCH"

if git merge-base --is-ancestor FETCH_HEAD HEAD; then
  echo "Already up to date with $UPSTREAM $BRANCH."
  set_output "changed=false"
  exit 0
fi

work="$(mktemp -d)"
git merge --no-commit --no-ff FETCH_HEAD || true
if [ ! -f .git/MERGE_HEAD ]; then
  echo "Merge did not start; refusing to report success." >&2
  exit 1
fi

git ls-files -u | cut -f2 | sort -u > "$work/conflicts"
while IFS= read -r path; do
  [ -z "$path" ] && continue
  if is_fork_path "$path"; then
    echo "conflict (fork): $path"
    take_side ours "$path"
  else
    echo "conflict (upstream): $path"
    take_side theirs "$path"
  fi
done < "$work/conflicts"

# Upstream-owned files that carry fork additions: keep upstream's copy and
# merge the fork's extra entries back, key by key. grep exits 1 when no such
# path conflicts, and pipefail would turn that into a failed sync.
manifests="$work/manifests"
grep -E '(^|/)package\.json$|^apps/mobile/app\.config\.ts$' "$work/conflicts" > "$manifests" || true
if [ -s "$manifests" ]; then
  xargs -r python3 .github/scripts/reconcile-fork-manifests.py < "$manifests"
fi

git commit --no-edit -q
set_output "changed=true"
git log --oneline -1
