# Test coverage policy

CI measures Rust line coverage once on Linux with `cargo-llvm-cov`. Its default source filtering is intentional: dependencies, vendored sources, the `tests/` directory, `tests.rs`, and `*_tests.rs` files do not count. Inline `#[cfg(test)] mod tests` blocks in production files remain part of LLVM's file-level report; excluding those blocks requires unstable coverage attributes, so the baseline records the tool's stable default rather than modifying hundreds of test modules. The LCOV report is retained as a workflow artifact and the measured percentage and delta are written to the job summary.

The target floor is 80%. The ratchet compares each measurement with the committed value in `coverage-baseline.txt` and the default branch's baseline. When the committed baseline is below 80%, it also sets the floor. Coverage increases advance the committed baseline.

Where local Rust verification is authorized, use the coverage tool pinned in the release workflow.

```bash
cargo install cargo-llvm-cov --version 0.9.2 --locked --force
cargo llvm-cov clean --workspace
cargo llvm-cov --locked --all-features --workspace --no-report
cargo llvm-cov report --json --summary-only --output-path coverage-summary.json
rust-script scripts/check-coverage.rs \
  --report coverage-summary.json \
  --baseline coverage-baseline.txt
```

When coverage rises, the checker updates `coverage-baseline.txt`; commit that diff so the ratchet increase is reviewable. A pull request cannot lower the default-branch baseline silently. Maintainers may apply the `coverage-exception` label for an intentional decrease, but CI still rewrites the baseline to the measured value and requires that change to be committed and reviewed.

Compiler upgrades can change which lines count toward coverage. To measure a known buildable base with the current coverage tools, dispatch the Benchmarks workflow from the candidate branch and provide the base commit SHA. This uses the complete coverage command after both revisions pass their JavaScript gates. The report shows the covered and measured line counts for review alongside the candidate's coverage report.

```bash
gh workflow run benchmarks.yml --ref "$candidate_branch" \
  -f base="$coverage_base_sha" -f measure_base_coverage=true
```

Line coverage only shows that a test executed a line. It is a floor against new blind spots, not evidence that behavior is correct, and it does not replace failure-path, concurrency, integration, or adversarial tests.

Mutation testing is the complement for the modules where a wrong answer is a security failure: `.cargo/mutants.toml` lists token validation and reservations, the upstream SSRF guard, authentication, credential handling, budget settlement and log redaction, and the `Mutants` workflow fails when a mutant survives (issue #672). See [testing-tiers.md](testing-tiers.md#replay-performance-stability-platform-and-upgrade-checks) for that and the other non-coverage checks.
