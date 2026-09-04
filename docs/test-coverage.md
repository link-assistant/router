# Test coverage policy

CI measures Rust line coverage once on Linux with `cargo-llvm-cov`. Its default source filtering is intentional: dependencies, vendored sources, the `tests/` directory, `tests.rs`, and `*_tests.rs` files do not count. Inline `#[cfg(test)] mod tests` blocks in production files remain part of LLVM's file-level report; excluding those blocks requires unstable coverage attributes, so the baseline records the tool's stable default rather than modifying hundreds of test modules. The LCOV report is retained as a workflow artifact and the measured percentage and delta are written to the job summary.

The long-term absolute floor is 80%. The canonical Ubuntu CI measurement is 76.824610%, so enforcing 80% immediately would prevent all changes, including coverage improvements. Until 80% is reached, the committed `coverage-baseline.txt` is both the floor and the ratchet: coverage may rise but may not fall. The planned ramp has four coverage-focused milestones: 77.50%, 78.50%, 79.25%, and 80.00%. Any incidental increase advances the baseline too.

Run the same check locally with:

```bash
cargo install cargo-llvm-cov --version 0.9.0 --locked
cargo llvm-cov clean --workspace
cargo llvm-cov --locked --all-features --workspace --no-report
cargo llvm-cov report --json --summary-only --output-path coverage-summary.json
rust-script scripts/check-coverage.rs \
  --report coverage-summary.json \
  --baseline coverage-baseline.txt
```

When coverage rises, the checker updates `coverage-baseline.txt`; commit that diff so the ratchet increase is reviewable. A pull request cannot lower the default-branch baseline silently. Maintainers may apply the `coverage-exception` label for an intentional decrease, but CI still rewrites the baseline to the measured value and requires that change to be committed and reviewed.

Line coverage only shows that a test executed a line. It is a floor against new blind spots, not evidence that behavior is correct, and it does not replace failure-path, concurrency, integration, or adversarial tests.
