#!/usr/bin/env bash
# Pull latest from the open-source ChoreQuest repo and merge into current branch.
# One-time: git remote add upstream https://github.com/OWNER/chorequest.git

set -e
UPSTREAM_BRANCH="${1:-main}"

if ! git remote get-url upstream &>/dev/null; then
  echo "Remote 'upstream' not found. Add it first:"
  echo "  git remote add upstream https://github.com/OWNER/chorequest.git"
  exit 1
fi

echo "Fetching upstream..."
git fetch upstream

echo "Merging upstream/$UPSTREAM_BRANCH..."
if git merge "upstream/$UPSTREAM_BRANCH" --no-edit; then
  echo "Merge done. Push when ready: git push origin $(git branch --show-current)"
else
  echo "There are merge conflicts. Fix them, then: git add . && git commit"
  exit 1
fi
