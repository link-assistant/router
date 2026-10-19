#!/usr/bin/env bash
# Reproduce and repair the rollback of issue #644 with two local data roots.
#
#   ./examples/token-rollback-recovery.sh [path/to/router]
#
# 1. Root B issues a client token (the "new release" data root).
# 2. The server answers from root A (the "rolled back" root): the token's
#    signature verifies but its record is missing.
# 3. `router tokens import` copies exactly that record into A; nothing else
#    changes and no token is rotated.
set -euo pipefail

ROUTER="${1:-router}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
export TOKEN_SECRET="$(openssl rand -hex 32)"
export STORAGE_POLICY=text

DATA_DIR="$WORK/a" "$ROUTER" tokens issue --local --label existing >/dev/null
DATA_DIR="$WORK/b" "$ROUTER" tokens issue --local --label run >/dev/null

echo "== before: root A"
DATA_DIR="$WORK/a" "$ROUTER" tokens list --local
echo "== dry run"
DATA_DIR="$WORK/a" "$ROUTER" tokens import --local --from "$WORK/b" --dry-run
echo "== import"
DATA_DIR="$WORK/a" "$ROUTER" tokens import --local --from "$WORK/b"
echo "== again (idempotent)"
DATA_DIR="$WORK/a" "$ROUTER" tokens import --local --from "$WORK/b"
echo "== after: root A"
DATA_DIR="$WORK/a" "$ROUTER" tokens list --local
