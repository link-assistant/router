# Issue 29 Requirements Trace

| Requirement | Status | Evidence |
| --- | --- | --- |
| Read issue details and comments thoroughly. | Done | `raw/issue-29.json`, `raw/issue-29-comments.json`; no issue comments were present. |
| Preserve CI logs and data under `docs/case-studies/issue-29`. | Done | `raw/run-25611545944.log`, `raw/run-25611545944.json`, artifact metadata, and downloaded raw artifact archive. |
| List recent branch runs with timestamps and SHAs. | Done | `raw/recent-runs-issue-branch.json`. |
| Analyze the actual failed CI error. | Done | `README.md` timeline and root cause cite the failing log lines. |
| Compare the full CI/CD file tree with JS, Rust, Python, and C# templates. | Done | `raw/*-template-file-tree.txt`, copied workflow/script files, and `template-comparison.md`. |
| Search online for additional facts and cite primary sources. | Done | `online-research.md` cites docs.rs and GitHub REST API documentation. |
| If the same issue exists in a template, report it upstream. | Not needed | The Rust template already contains the fixed parser, so there is no current upstream template bug to report. |
| Create a reproducing automated test before the fix. | Done | `raw/failing-regression-test.log` shows the new test failing before the script change. |
| Implement the fix. | Done | `scripts/create-github-release.rs` no longer uses look-around. |
| Add a changelog fragment. | Done | `changelog.d/20260510_090000_fix_release_changelog_regex.md`. |
| Verify locally. | Done | `raw/local-cargo-fmt.log`, `raw/local-cargo-clippy.log`, `raw/local-check-file-size.log`, `raw/local-cargo-test-all-features.log`, `raw/local-cargo-test-doc.log`, `raw/local-cargo-build-release.log`, and package-list logs. |
| Update PR 30. | Tracked in GitHub | Initial PR metadata is preserved in `raw/pr-30.json`; final title, body, draft state, and CI status are authoritative on PR 30. |
