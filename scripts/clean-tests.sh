#!/usr/bin/env bash
set -euo pipefail

# Safe-clean test artifacts in repository root
# Usage: ./scripts/clean-tests.sh [--full] [--confirm]
#   --full    Also remove .test-dependency-cache
#   --confirm Required for destructive operations (for CI you can pass --confirm)

ROOT_DIR="$(pwd)"

FULL_MODE=0
CONFIRM=0

for arg in "$@"; do
  case "$arg" in
    --full)
      FULL_MODE=1
      ;;
    --confirm)
      CONFIRM=1
      ;;
    --help|-h)
      echo "Usage: $0 [--full] [--confirm]"
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg"
      echo "Usage: $0 [--full] [--confirm]"
      exit 1
      ;;
  esac
done

# Find test-* directories at repository root, exclude test-cli-project
mapfile -t TEST_DIRS < <(find "$ROOT_DIR" -maxdepth 1 -type d -name 'test-*' ! -name 'test-cli-project' -printf '%f\n' || true)

if [ ${#TEST_DIRS[@]} -eq 0 ]; then
  echo "No test-* directories found to remove."
else
  echo "Found test directories to remove:"
  for d in "${TEST_DIRS[@]}"; do
    echo " - $d"
  done

  if [ "$CONFIRM" -ne 1 ]; then
    echo "Dry run: no directories will be removed. Re-run with --confirm to delete them."
    exit 0
  fi

  for d in "${TEST_DIRS[@]}"; do
    echo "Removing: $d"
    rm -rf "$ROOT_DIR/$d"
  done
fi

if [ "$FULL_MODE" -eq 1 ]; then
  echo "Full mode: also removing .test-dependency-cache if present"
  if [ "$CONFIRM" -ne 1 ]; then
    echo "--confirm required for full mode. Aborting." >&2
    exit 1
  fi
  if [ -d "$ROOT_DIR/.test-dependency-cache" ]; then
    echo "Removing .test-dependency-cache"
    rm -rf "$ROOT_DIR/.test-dependency-cache"
  else
    echo ".test-dependency-cache not present"
  fi
fi

echo "Cleanup complete."
