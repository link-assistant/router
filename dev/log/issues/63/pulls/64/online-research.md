# Online research

Research was performed on 2026-08-08. Primary or project-maintainer sources were preferred.

## Facts used by the fix

- [GitHub's Node 20 deprecation notice](https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/) says Actions users must update to action releases that run on Node 24. Runners began forcing Node 24 on 2026-06-16, which explains both the runner warning and the deprecated Node APIs emitted by the old action bundles.
- [`actions/checkout`](https://github.com/actions/checkout) documents `checkout@v6` and its Node 24 runtime. The current Rust template also uses v6.
- [`actions/setup-node` advanced usage](https://github.com/actions/setup-node/blob/main/docs/advanced-usage.md) demonstrates `setup-node@v6` with Node 24. The current Rust template uses the same combination.
- [Cargo's `cargo package` reference](https://doc.rust-lang.org/beta/cargo/commands/cargo-package.html) documents `--allow-dirty` as permission to package a checkout with uncommitted changes. It would hide this incident rather than repair it, so the strict dirty-tree check is retained and `--locked` is added.
- [RUSTSEC-2026-0190](https://rustsec.org/advisories/RUSTSEC-2026-0190) affects `anyhow` versions below 1.0.103 and identifies 1.0.103 as patched. The lockfile is updated accordingly.
- The [`cargo-audit` example configuration](https://docs.rs/crate/cargo-audit/latest/source/audit.toml.example) documents the output `deny` setting. `deny = ["warnings"]` turns future allowed warnings into a failing check.

## Existing tools evaluated

- [actionlint](https://github.com/rhysd/actionlint/blob/main/README.md) can statically validate workflow syntax and expression types. It is useful as a future dedicated workflow-lint job, but adding another downloaded tool was not necessary to repair the observed failure.
- [zizmor](https://github.com/zizmorcore/zizmor) finds GitHub Actions security problems such as excessive permissions and credential persistence. This change applies its most directly relevant principle by setting read-only top-level permissions and granting writes only to release jobs.
- [cargo-deny](https://github.com/EmbarkStudios/cargo-deny) can combine advisory, license, source, and duplicate-dependency policy. The repository already has a justified `cargo-audit` policy and an npm audit, so replacing that established mechanism would be unnecessary scope expansion.
- [RustSec](https://rustsec.org/) lists both `cargo-audit` and `cargo-deny` integrations. Retaining `cargo-audit` avoids migration risk while still failing closed on new warnings.

## Template defect check

The Rust template already contains Cargo.lock synchronization in `scripts/version-and-commit.rs`. Its history identifies commit `0f922c0119f65f1574e8eee46a23ad9257594775` (`fix: sync Cargo.lock during release version bump`, 2026-05-15), predating this incident. The JavaScript and Python templates use their ecosystems' lock/version mechanisms and do not contain the Rust release path. No upstream template issue was filed because the defect is not present in any current template.
