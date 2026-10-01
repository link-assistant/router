#!/usr/bin/env bash
# Issue #648: measure which lcov source files each way of sharing src/main.rs
# between two bin targets produces. Needs cargo-llvm-cov and llvm-tools.
set -euo pipefail
cd "$(dirname "$0")"
for variant in relative manifest; do
  cargo llvm-cov clean --workspace >/dev/null 2>&1
  cargo llvm-cov --quiet --bin canonical --bin "$variant" --lcov --output-path "/tmp/include-coverage-$variant.info" >/dev/null 2>&1
  echo "canonical + $variant:"
  grep '^SF:' "/tmp/include-coverage-$variant.info" | sed "s|^SF:$PWD/|  |"
done
