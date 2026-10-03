#!/usr/bin/env bash
set -euo pipefail

backend_dir="${1:?usage: backend-sync.sh <backend-repo-dir>}"
repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
marker="$repo_root/docs/backend-sync.md"

[ -d "$backend_dir/.git" ] || exit 0
[ -f "$marker" ] || exit 0

last="$(grep -oE 'Last synced backend commit: `[0-9a-f]{7,40}`' "$marker" | grep -oE '[0-9a-f]{7,40}' | head -1 || true)"
[ -n "$last" ] || exit 0

commits="$(git -C "$backend_dir" log --format='- %h %ad %s' --date=format:'%Y-%m-%d %H:%M' "$last..HEAD" 2>/dev/null || true)"
dirty="$(git -C "$backend_dir" status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
count="$(printf '%s' "$commits" | grep -c '^- ' || true)"

[ "$count" -eq 0 ] && [ "$dirty" -eq 0 ] && exit 0

if [ "$count" -gt 0 ]; then
  summary="Backend has $count new commit(s) since the last frontend sync ($last)"
  [ "$dirty" -gt 0 ] && summary="$summary, plus $dirty uncommitted file change(s) in progress"
else
  summary="Backend is synced at $last; $dirty uncommitted file change(s) are in progress there (not built against until committed)"
fi

context="$summary. Review them (git -C $backend_dir log/show, $backend_dir/frontend-handoff, http://localhost:3002/api/docs-json), implement the frontend side, then update docs/backend-sync.md.
$commits"

jq -n --arg msg "$summary." --arg ctx "$context" \
  '{systemMessage: $msg, hookSpecificOutput: {hookEventName: "SessionStart", additionalContext: $ctx}}'
