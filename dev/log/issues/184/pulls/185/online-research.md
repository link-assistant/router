# Online and component research

Research was performed on 2026-08-15. Local snapshots and GitHub API results in
this directory preserve the exact material used.

## Root-cause sources

- [cargo-cyclonedx CLI documentation](https://github.com/CycloneDX/cyclonedx-rust-cargo/tree/cargo-cyclonedx-0.5.9/cargo-cyclonedx): `--override-filename` is a custom filename prefix. The pinned generator's `filename` function formats the prefix and then appends `.<format>`; the saved source proves that `link-assistant-router.cdx.json` becomes `link-assistant-router.cdx.json.json` for JSON output.
- [GitHub artifact attestation permissions](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations): registry attestation storage records require `artifact-metadata: write` in addition to `id-token: write` and `attestations: write`.
- [actions/download-artifact issue 484](https://github.com/actions/download-artifact/issues/484): the open upstream issue contains this repository's exact Node 24 `DEP0005` warning and traces it to v8's bundled extraction dependency. The immutable v7.0.0 commit is preserved in `download-artifact-v7-tags.txt`; downgrading only this action is the available warning-free workaround.
- [GitHub Actions concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency): `cancel-in-progress` can be an expression. The workflow now cancels superseded PR checks but never release-capable push/manual runs.
- [Vite build options](https://vite.dev/config/build-options): Vite reports chunks above its warning threshold. Rollup/Rolldown `manualChunks` is used instead of hiding the warning, producing separate 14 kB application, 192 kB React, and 326 kB UI-vendor chunks.

## Existing components and template comparison

- `cargo-cyclonedx` remains the correct pinned SBOM generator; the defect was its
  caller's filename contract, not missing generator capability.
- `actions/attest-build-provenance` already supports registry provenance and
  storage; the caller omitted a documented permission.
- `actions/download-artifact` v7 is SHA-pinned as a temporary workaround while
  upstream issue 484 remains open. No duplicate issue was filed.
- The Rust template and hive-mind guide supplied patterns for Cargo.lock-aware
  detection, `dev/log` exclusion, warning-free release tooling, secret scanning,
  fresh-merge checks, Docker preflight builds, and safe concurrency.
- Repository-specific choices were retained where they are already stronger or
  intentional: three-platform Rust tests, coverage ratcheting, immutable action
  pins, native multi-architecture image builds, scheduled release reconciliation,
  public-GHCR verification, and the architecture test that deliberately avoids a
  duplicate disposable Docker build before release.
- JavaScript and Python templates were inspected as language-agnostic references.
  Their OIDC, immutable-action, timeout, audit, and warning policies are already
  represented here. Package-specific npm/PyPI publication steps do not apply to
  this Rust binary; the UI is private and embedded, so `npm ci` + deterministic
  Vite build verification is the applicable JavaScript check.

## Upstream-report decision

No new upstream report was opened. The download warning is already captured by
the exact, reproducible open issue 484. The attestation warning is resolved by a
documented caller permission, and cargo-cyclonedx behaves according to its pinned
implementation. Filing either as an upstream defect would be a duplicate or a
misdiagnosis.
