#!/usr/bin/env bash
# Prune build artifacts the most recent build did not touch, then re-stamp.
#
# `target/` retains every superseded artifact: this workspace links many test
# and binary targets, and nothing evicts the previous ones. Left alone it can
# grow without bound.
#
# The stamp/sweep order matters and is easy to get backwards. `cargo sweep
# --stamp` records "everything older than now is stale"; `--file` then deletes
# what predates it. Stamping *after* a build therefore marks that build's own
# output for deletion. This script sweeps against the previous stamp first,
# then lays down a new one for next time.
#
# Exits zero unconditionally: pruning a cache is never a reason to reject a
# commit, and `cargo-sweep` is optional tooling a contributor may not have.
set -u

command -v cargo-sweep >/dev/null 2>&1 || {
    echo "cargo-sweep not installed; skipping (cargo install cargo-sweep)" >&2
    exit 0
}

if [ -f sweep.timestamp ]; then
    cargo sweep --file >/dev/null 2>&1 || true
fi
cargo sweep --stamp >/dev/null 2>&1 || true
exit 0
