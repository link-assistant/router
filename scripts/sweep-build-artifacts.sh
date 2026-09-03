#!/usr/bin/env bash
# Clear this checkout's Rust build output after pre-commit verification.
#
# Worktrees have independent target directories, so cleaning the manifest that
# owns this script reclaims the exact cache the preceding hooks populated. A
# configured CARGO_TARGET_DIR remains authoritative, as it is for every Cargo
# command.
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repository_root="$(cd "${script_dir}/.." && pwd)"

cargo clean --manifest-path "${repository_root}/Cargo.toml"
