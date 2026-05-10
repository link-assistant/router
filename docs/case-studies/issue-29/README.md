# Issue 29 Case Study: CI/CD fails

## Summary

Issue 29 reported a failing CI/CD run for `link-assistant/router`. The failing run was
`25611545944`, and the failed job was `Auto Release` / `Create GitHub Release`.

The root cause was not the package build, crates.io publish, or Docker publish. Those
steps completed successfully. The release failed after artifact publishing because
`scripts/create-github-release.rs` tried to compile this Rust regex pattern while
extracting release notes from `CHANGELOG.md`:

```text
(?s)## \[0\.15\.0\].*?\n(.*?)(?=\n## \[|$)
```

Rust's `regex` crate does not support look-around syntax such as `(?=...)`, so the
script panicked before it could call the GitHub Releases API.

## Evidence

Archived investigation data is stored under `docs/case-studies/issue-29/raw/`:

- `run-25611545944.log`: full failed CI log.
- `run-25611545944.json`: failed run metadata and job timeline.
- `run-25611545944-artifacts-full.json`: artifact metadata.
- `artifacts/link-assistant-router-XH6HTV.dockerbuild.gz`: raw downloaded Docker build artifact archive.
- `issue-29.json`, `issue-29-comments.json`: issue body and comments.
- `pr-30.json`, `pr-30-*.json`: prepared pull request metadata and comments.
- `*-template-*`: copied CI/CD scripts and workflow files from the JS, Rust, Python, and C# templates.
- `failing-regression-test.log` and `passing-regression-test.log`: before/after regression test output.
- `local-cargo-*.log` and `local-check-file-size.log`: local verification output.

The GitHub CLI artifact downloader expected a zip archive for the Docker build record and failed with
`zip: not a valid zip file`. The raw artifact was downloaded separately with the authenticated artifact
URL and validated as gzip data. The downloader error is preserved in
`run-25611545944-artifact-download-error.txt`.

## Timeline

All timestamps are UTC.

| Time | Event |
| --- | --- |
| 2026-05-09 20:53:02 | `Detect Changes` started and later passed. |
| 2026-05-09 20:53:58 | `Lint and Format Check` and matrix test jobs started and later passed. |
| 2026-05-09 20:55:42 | `Build Package` started and passed. |
| 2026-05-09 20:56:53 | `Auto Release` started. |
| 2026-05-09 21:00:29 | `Publish to Crates.io` completed successfully. |
| 2026-05-09 21:02:44 | Docker image publishing completed, then `Create GitHub Release` started. |
| 2026-05-09 21:02:48 | `scripts/create-github-release.rs` panicked while compiling the changelog regex. |

The decisive log lines are:

- `run-25611545944.log:7773`: invokes `rust-script scripts/create-github-release.rs --release-version "0.15.0"`.
- `run-25611545944.log:7815`: panic at `scripts/create-github-release.rs:49:35`.
- `run-25611545944.log:7818`: `regex parse error`.
- `run-25611545944.log:7821`: `look-around, including look-ahead and look-behind, is not supported`.

## Root Cause

`scripts/create-github-release.rs` used one regex to locate a changelog section and stop before the next
`## [` section. The stop condition used a positive look-ahead: `(?=\n## \[|$)`.

That syntax works in JavaScript regex engines, but not in Rust's default `regex` crate. The panic happened
inside `Regex::new(...).unwrap()`, so the release script exited before constructing and sending the GitHub
release payload.

## Fix

The release helper now uses the same approach as the current Rust CI/CD template:

1. Match only the version heading with `(?m)^## \[<escaped-version>\]`.
2. Slice the text after that heading.
3. Find the next `## [` heading with a second supported regex.
4. Use the text before that next heading as the release notes.
5. Fall back to `Release v<version>` when the changelog file, version section, or section body is absent.

This removes the unsupported look-ahead while preserving the existing release payload and registry badge
behavior.

## Regression Test

`tests/release_workflow_test.rs` now contains
`release_script_avoids_unsupported_regex_lookaround`.

The test was added before the fix and failed against the old script because it still contained `(?=`.
After the script change, the same test passes and confirms the parser uses the next-section scan instead
of a look-around regex.

## Local Verification

The following local checks passed during investigation:

- `cargo fmt --all -- --check`
- `cargo clippy --all-targets --all-features`
- `rust-script scripts/check-file-size.rs`
- `cargo test release_script_avoids_unsupported_regex_lookaround`
- `cargo test --all-features --verbose`
- `cargo test --doc --verbose`
- `cargo build --release --verbose`
- `cargo package --list --allow-dirty`

`cargo package --list` without `--allow-dirty` was also attempted before commit and failed because Cargo
refuses to package a dirty worktree. That expected pre-commit failure is preserved in
`raw/local-cargo-package-list.log`.

## Related Template Work

The current Rust template already contains this fix and a more extensive changelog parsing test. No new
upstream template issue was opened because the upstream Rust template is already corrected. The router
repository had drifted from that fixed template code.

See `template-comparison.md` for the full JS, Rust, Python, and C# template comparison.
