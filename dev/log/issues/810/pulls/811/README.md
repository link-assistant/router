# Router dependency update

Issue #810 requests a repository-wide dependency refresh and remediation of the failures reported for six merged Dependabot updates. The starting repository commit was `1f11272a6c93a552eb3b0a47243e524a5fb27663`. The initial GitHub API read found one issue comment, no registered sub-issues, and no PR conversation comments, inline comments, or reviews. The issue comment identified CI for the starting `main` commit as pending. [Issue and discussion](https://github.com/link-assistant/router/issues/810), [pull request](https://github.com/link-assistant/router/pull/811), [conflicting Dependabot PR](https://github.com/link-assistant/router/pull/790).

## Requirements and evidence

| Requirement | Implementation and verification plan | Evidence or outcome |
| --- | --- | --- |
| Reconcile #767, #778, #787, #788, #789 and #809 | Inspect failed jobs by SHA, trace errors to the calling APIs or workflow policy, add regressions, and verify the complete replacement cycle | [Historical CI and source analysis](ci.md) |
| Include all seven action updates proposed in #790 or their current replacements | Compare every `uses:` reference against canonical upstream tags. Keep artifact custody, gate partitions and check commands intact | [Action versions](actions.tsv) |
| Inventory every dependency, including development, build, test, lint, base-image, toolchain and transitive entries | Read tracked manifests, lockfiles, workflows, scripts, images and flake pins and query publisher registries | [npm](npm.tsv), [Cargo](cargo.tsv) |
| Refresh all active manifests, constraints and lockfiles across ecosystems | Resolve compatible constraints with each ecosystem's native resolver and install from committed locks in CI | In progress |
| Read major migration guides, adapt APIs, remove superseded shims, use replacement features and fix deprecations | Review upstream changes for each selected major boundary, replace equivalent local logic, and run compatibility tests and lint | [Migration analysis](migrations.md) |
| Align repeated pins and explain all retained versions | Compare repeated active pins and identify compatibility matrices, older semver series required transitively and immutable captures | [Scope and retained versions](scope.md) |
| Keep dependency automation current | Configure Dependabot for active supported managers with real manifests and account for the remaining ecosystems | [Scope and retained versions](scope.md) |
| Run full builds, tests, lint and advisory checks | Collect the four manual JavaScript stages for the exact SHA before any Rust CI. Check current advisories in each ecosystem and retain full CI outcomes | [CI and advisories](ci.md) |
| Review upstream bugs and general-purpose local code, search prior reports and publish applicable reports with reproducible examples | Identify each upstream project and version from dependency metadata and link existing or new findings | [Migration and upstream analysis](migrations.md) |
| Follow the dependency-update practices and finish in PR #811 | Preserve chronological commits, a changelog fragment, current main ancestry, closing reference, passing CI and review coverage | [Dependency update practices](https://github.com/link-assistant/hive-mind/blob/main/docs/DEPENDENCY-UPDATE-BEST-PRACTICES.md) |

Registry tables record the starting manifest and lockfile versions and the upstream versions observed during this update. The most recent release of a crate can belong to a different semver series from the series its consumer requires.
