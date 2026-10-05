# Issues #687–#689: investigation and implementation plan

Work is confined to PR https://github.com/link-assistant/router/pull/690 and
branch `issue-689-4bcc94b199c2`.

## Requirements and proposed solutions

| Requirement | Alternatives considered | Implementation and verification plan |
| --- | --- | --- |
| #689: read every child issue and every comment | None; parent scope is mandatory | Preserve both issue bodies, read native sub-issues and all comment endpoints. |
| #689: implement both issues in one PR | None | Keep all changes and tests in PR #690. |
| #689: close every issue with a separate keyword | None | Include `Fixes #687`, `Fixes #688`, and `Fixes #689` in the final description. Explicitly document any unreproducible/resolved requirement. |
| #687: Docker dependency build must parse all declared targets | Copy target directories; generate stubs from the manifest; cargo-chef | Reproduce manifest parsing in an isolated temporary project, then select a general solution covering benches, tests, examples and custom paths, without compiling unnecessary targets. |
| #687: publish amd64 and arm64 images for a usable release | Repair immutable 1.16.0; publish next patch | Preserve release history; add a Fixed changelog fragment to trigger the repository's automatic patch release after merge. Both native architectures and both registries remain required. |
| #687: gate GitHub stable/latest and crates.io on every binary, image and manifest | Draft release with final promotion; prerelease until artifacts succeed | Prepare release metadata without stable announcement; delay crates.io and stable/latest promotion until artifact matrices and provenance checks succeed; retain recovery behavior. |
| #687: PR must build Dockerfile without pushing when manifest, Dockerfile or benches change | Separate path-filtered workflow; job in release workflow | Add an amd64 runtime build check with bounded CI job duration and include all target/build inputs in its triggers. |
| #687: check default image availability before planning | Registry HTTP API; Docker buildx manifest inspection | Reuse Docker tooling, report the version and `--image` remedy; cover local container, staging and remote paths while preserving host/status/removal semantics where applicable. |
| #688: config must equal flags for every deploy/local key in host and container modes | Strip default values at dispatch; distinguish clap IDs | Reproduce through the real binary, remove the global default collision, and add table-driven CLI comparisons for all supported section fields and CLI precedence. |
| #688: handle `~` root paths clearly | Reject with config-relative explanation; expand current user's home | Expand `~`/`~/` before config-directory resolution; cover config and flag paths throughout local/staging/remote handling, with clear unsupported-home errors. |
| #688: serving host on a different port is a named blocker | Infer existing port; refuse mismatch | Report `port-mismatch` during status and refuse mutation before any second process or data-store writer can start. |
| Entire-codebase audit | None | Search all Dockerfiles, image selection sites, config path resolvers, CLI parsing entry points and host planners. |

## Todo and investigation protocol

- [x] Verify branch and clean initial checkout; read contribution guidance.
- [x] Read parent and child issues and all issue/PR comments (initially empty).
- [x] Preserve and analyze the failed release run, including timestamps/SHA.
- [x] Read recent related PRs and online primary documentation/components.
- [x] Write minimal failing regressions before each bug fix.
- [x] Implement Docker/CI/release fixes and deployment image preflight.
- [x] Implement config parity, home expansion and host mismatch protection.
- [x] Run 48 focused integration tests, formatting, all-target/all-feature
  Clippy with warnings denied, file-size, terminology and applicable script
  checks; preserve large logs. The broader suite and CI are tracked in the PR.
- [x] Add the automatic patch-release changelog trigger.
- [x] Commit useful atomic changes after checks.
- [x] Fetch latest main (already an ancestor); push only the prepared branch.
- [x] Read the PR diff, verify requirements and existing behavior; correct
  the additional preflight-order regressions exposed by the broader suite.
- [x] Reproduce the macOS CI lifecycle-lock race with an inherited descriptor;
  share an explicit unlock guard across local, host and staging operations.
- [ ] Update title/body and closing references; mark PR ready.
- [ ] List latest CI runs with timestamps/SHA; preserve every failed run's logs
  in `ci-logs/`, read large logs in chunks of at most 1500 lines, fix specific
  errors, and await every latest-head check before finishing.
- [ ] Confirm clean working tree and report PR URL, validation and limits.

Experiment scripts live in `experiments/`; realistic reusable examples belong
in `examples/`. No stress experiment may run with unbounded input or memory.
No background command is left running at completion.

## Evidence and root causes

- The failed [release run 37298752255](https://github.com/link-assistant/router/actions/runs/37298752255)
  started at `2026-10-05T10:46:53Z`, from `9a0f4c18795c61134dbfbf49cb9f3b719c940447`.
  Its log was downloaded in full locally. Lines 79329–79330 (arm64) and
  87292–87293 (amd64) report that Cargo cannot find the `hot_paths` bench while
  parsing the manifest. GitHub release creation had already succeeded; both
  image builds failed and manifest publication was skipped.
- The manifest-only Docker layer stubbed just the library and binaries. Cargo
  validates explicitly declared targets before selecting `--bins`, so changing
  build flags alone cannot solve this failure. The final layer also needs the
  real declared targets after the stubs are removed.
- Clap propagates the root's global `port` default into `DeployArgs.port` as
  `Some(8080)`. Consequently `args.port.or(section.port)` discards a configured
  port. `experiments/issue-689/port_defaults.rs` demonstrates the collision.
  The CLI now uses clap's `ValueSource` to distinguish a default from an
  explicit flag/environment value, preserving the public `Cli.port: u16` API.
- Config paths previously joined every relative path to the file directory,
  including a literal `~/...`. Root home expansion is now deferred until the
  deployment target is selected. Local/staging roots use the caller's home;
  remote roots use the target user's home. Ordinary relative config roots retain
  their existing file-relative meaning. SSH file paths expand locally.
- Existing host assessment already refused changing the recorded listener,
  but named it `stable-listener-change` and still printed `action=start-host`.
  It now reports `port-mismatch` and prints no mutation steps for hard blockers.
  A real-process regression verifies the PID and original health endpoint remain
  unchanged on status and mutation attempts.

## Existing components and selected alternatives

- [cargo-chef](https://github.com/LukeMathWalker/cargo-chef) provides general
  prepare/cook dependency caching and can model all targets. It would add an
  installed, version-pinned build tool. A small Python standard-library
  `tomllib` generator is sufficient for this single-package repository and
  covers explicit custom paths without a new application dependency.
- [Cargo target declarations](https://doc.rust-lang.org/cargo/reference/cargo-targets.html)
  explain explicit and inferred target paths. Tests exercise benches, tests,
  examples, custom library/binary paths, the repository's real manifest, and
  replacing stubs with real sources for the final layer.
- [clap ValueSource](https://docs.rs/clap/latest/clap/parser/enum.ValueSource.html)
  supplies the distinction needed for config precedence. Renaming the clap
  argument or changing `Cli.port` to `Option<u16>` were alternatives, but would
  change existing global-flag behavior or a public API.
- [shellexpand](https://docs.rs/shellexpand/latest/shellexpand/) can expand both
  home and environment variables. Only `~`/`~/` is needed here; the selected
  helper deliberately performs no shell/environment-expression evaluation.
- [Docker manifest inspect](https://docs.docker.com/reference/cli/docker/manifest/inspect/)
  checks registry existence without a pull or daemon mutation. A cached image
  is accepted for offline operation. Registry absence is `image-unpublished`;
  authentication/network failures remain `image-unavailable`. Checks use the
  existing bounded subprocess runner.
- [gh release edit](https://cli.github.com/manual/gh_release_edit) supports
  prerelease-to-stable promotion and explicit latest selection. Preparing a
  prerelease preserves existing asset-upload and provenance flows. A draft
  release was also considered, but a visible prerelease is easier to diagnose
  and recover while accurately showing incomplete delivery.
- [GitHub workflow triggers](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow)
  support a separate PR Docker build without registry credentials or pushes.
  [actionlint](https://github.com/rhysd/actionlint) validates the changed workflow
  syntax in addition to repository-specific publication and tool checks.

## Scope and codebase audit

The active root Dockerfile is fixed; the tunnel Dockerfile does not build this
Cargo manifest, and the failing-candidate example layers an intentionally broken
candidate over an existing image. Historical case-study captures remain records.
Both installed CLI names share the corrected argument parser. Config port
precedence applies to local/container/host and remote deployments.

The real-CLI local table covers port, instance, image, build, root, mode,
claude_credentials and public_port (including its local refusal), in `[deploy]`
and `[local]`, with both host/container modes. Separate real-CLI remote tables
cover server, instance, port, public_port, image, build, root and seed_credentials
in their applicable remote context. `server` and `seed_credentials` are
documented remote-only controls: a shared config does not silently redirect a
local deployment to SSH, and local runs retain the existing notice for ignored
remote credential settings. Explicit CLI ports (including 8080) and ROUTER_PORT
remain overrides. Real host startup with config alone verifies HTTP health and
convergence, beyond checking rendered plans.

The issue's suggestion that remote default deployment pulls GHCR does not match
the current implementation: remote defaults build the exact release source tag
on the target. That feature is preserved and covered by existing tests; image
preflight is applied to default local container and staging plans, which depend
on published images. Explicit images/builds, host mode, removal and restoration
retain their existing paths. The unrelated managed-server provisioner's moving
image selection is outside `router deploy` and is unchanged.

Stable/latest GitHub publication and crates.io are gated on the complete binary
matrix, Docker manifests in both registries, provenance and macOS lifecycle
checks. Delivery/recovery scripts also distinguish prerelease from stable.
Registry artifact identity and release-tag recovery remain unchanged. The patch
fragment triggers the next release after merge; this PR cannot publish a fixed
stable release from default-branch source before it is merged.

## Validation notes

The initial prepared-branch CI run
[37332686579](https://github.com/link-assistant/router/actions/runs/37332686579)
at `2026-10-05T15:25:17Z` tested only placeholder SHA
`9ff6fabbc2cca1bc22920c424187ce8fb0e35813`. Its one failure was the missing
changelog fragment (saved log line 6004). The implementation adds the fragment
and removes the placeholder `.gitkeep`; later checks must be compared with the
actual implementation SHA.

Local workspace memory is capped at 3 GB. Parallel LLVM compilation of the
large library test crate exceeded that cap even with one Cargo job and debug
symbols disabled. `experiments/issue-689/low-memory-rustc.py` is a local-only
wrapper to serialize that crate's LLVM backend and disable MIR optimization,
retaining normal dependency artifacts and codegen units. Incremental compilation
is disabled for the diagnostic run. The experiment still exceeds the cap at
code generation (reported compiler RSS around 2731 MB, plus process/runtime
overhead); it is retained as diagnostic evidence, not a successful workaround.
CI and production flags remain unchanged.
The 48 focused integration tests pass, including real config-only host startup,
all applicable config/flag table rows, explicit CLI/environment precedence,
remote target-home expansion, image preflight, PID-preserving port refusal and
release/Docker workflow gates. All-target/all-feature Clippy with warnings denied,
formatting, actionlint and repository static checks pass. The Docker cache
experiment passes both tests, including package-named binaries and custom source
extensions. Release script tests pass (10 create-release, 5 delivery and 2
release-needed tests); the standalone path helper passes both tests.
The complete binary/integration suite, doc tests and latest-head CI results are
reported in PR #690 as they complete.
The broader local suite exposed preflight-order regressions in existing
credential-sharing and staging CLI tests: a credential refusal must remain
independent of Docker, and staging status/verification of an absent namespace
must remain read-only and succeed without an image. Credential refusal now
precedes the default image check; staging checks the image only for a mutating
start, after validating the namespace, preserving its structured error report.
After those corrections, all 104 binary/integration targets pass locally:
1,083 tests passed and one opt-in test was ignored. Doc tests also pass.
The previous-head [CI run 37340177325](https://github.com/link-assistant/router/actions/runs/37340177325)
also exposed a macOS deployment lifecycle-lock race in
`deploy_local_secret_tests.rs:165` (saved combined log lines 16106–16119).
An operation's file was closed, but an unrelated child could briefly retain an
inherited descriptor and its shared Unix lock. A deterministic regression first
failed with `WouldBlock` after dropping the operation while retaining a cloned
descriptor. The operation now explicitly unlocks when its scope ends; the same
guard is reused by local/container, host and staging deployments. The test also
verifies that a competing operation remains blocked while the owner is active.
Rust's [File locking documentation](https://doc.rust-lang.org/std/fs/struct.File.html#method.unlock)
documents explicit unlocking of the shared file lock; the regression exercises
the duplicate-descriptor case rather than depending on parallel fork timing.
After this correction, all 104 binary/integration targets pass again: 1,085
tests passed and one opt-in test was ignored. All-target/all-feature Clippy
with warnings denied, formatting, file-size and terminology checks pass. The
portable remote-agent regression separately passes all four parity tests.
On the subsequent head, Ubuntu tests and the full amd64 Docker runtime build
passed. macOS then exposed that the new direct remote-agent test depended on
the host having GNU timeout, a Linux target prerequisite. The absent-deployment
status test now supplies a fixture that fails if invoked, so it exercises only
home expansion and read-only status on every Unix test host. CI coverage also
rose from 85.938702% to 86.010891% (71,709 / 83,372 lines; saved coverage log
lines 4974–5013), requiring the improved baseline to be committed. The existing
coverage floor and ratchet remain unchanged.
Full logs, including resource failures, are preserved locally under `ci-logs/`
and excluded from commits by the existing `*.log` rule.
