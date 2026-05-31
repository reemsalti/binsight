#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v git >/dev/null 2>&1 || ! git --version >/dev/null 2>&1; then
  echo "Git is not available. Install Apple Command Line Tools first:"
  echo "  xcode-select --install"
  echo "Complete the dialog, then re-run this script."
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  GH="$HOME/.local/bin/gh"
else
  GH="gh"
fi

if ! "$GH" auth status >/dev/null 2>&1; then
  echo "Log in to GitHub first: gh auth login"
  exit 1
fi

REPO="${1:-reemsalti/binsight}"

if [ ! -d .git ]; then
  git init -b main
fi

git add -A
git status --short

if git diff --cached --quiet; then
  echo "Nothing to commit."
else
  git commit -m "$(cat <<'EOF'
Initial commit: BinSight WMS operations console.

Mock IC console with work queue, rack/staging blueprints, PLT traceability,
load reference breakdown, investigations, holds, and stock reports.
EOF
)"
fi

if git remote get-url origin >/dev/null 2>&1; then
  echo "Remote origin already set."
else
  "$GH" repo create "${REPO#*/}" \
    --public \
    --source=. \
    --remote=origin \
    --description "Mock WMS operations console for inventory control (React + TypeScript portfolio)" \
    --push
  exit 0
fi

git push -u origin main
