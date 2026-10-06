#!/usr/bin/env bash
set -u
export CARGO_BUILD_JOBS=1 CARGO_PROFILE_DEV_DEBUG=0 RUST_LOG=error
failed=0
for check in check-file-size check-terminology check-release-workflow check-workflow-tools; do
  if rust-script "scripts/$check.rs" > "experiments/issue-697/logs/$check.log" 2>&1; then
    printf '%s passed\n' "$check"
  else
    printf '%s FAILED\n' "$check"; failed=1
  fi
done
for check in verify-contracts version-and-commit check-docker-platforms check-github-releases check-coverage detect-code-changes check-changelog-fragment check-release-provenance check-terminology create-github-release check-delivery upload-release-assets check-release-needed check-workflow-tools; do
  if rust-script --test "scripts/$check.rs" > "experiments/issue-697/logs/$check-tests.log" 2>&1; then
    printf '%s tests passed\n' "$check"
  else
    printf '%s tests FAILED\n' "$check"; failed=1
  fi
done
exit "$failed"
