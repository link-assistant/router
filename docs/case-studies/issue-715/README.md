# Issues 711–715: requirements, diagnosis and solution plan

All five issues and their complete comment threads were read on 2026-10-07; there were no comments. PR 716 initially had no discussion, reviews or inline comments. All work belongs to that PR with separate closing references for each issue.

## Requirement inventory

| Issue | Requirement | Solution and verification plan |
| --- | --- | --- |
| 715 | Read and implement all four children in one PR; defer none. | Audit shared callers and preserve reproductions, implementation and evidence together. Explicitly disclose external delivery blockers rather than reporting partial artifacts as delivery. |
| 715 | Close parent and every child using one keyword each. | PR body contains separate `Fixes #715`, `Fixes #711`, `Fixes #712`, `Fixes #713`, `Fixes #714` lines. |
| 715 | State any already resolved or unreproducible child explicitly. | All four defects have source/log evidence; macOS timing is reported evidence, not a production regression proven on this Linux workspace. |
| 711 | Diagnose default-parallel macOS failure and test-isolation/contention boundary. | Each log already owns its mutex/cache/root. The wall-clock assertion measures shared filesystem/CPU scheduling as well as accounting. Replace it with per-cache scan accounting; document that Linux/focused/sharded results do not prove the reported full macOS command. |
| 711 | Reliable bounded append accounting regression; protect against rescans rather than merely increasing timeout. | Count complete scans per cache only in test builds, assert repeated appends do not scan, and verify exact active byte accounting plus rescan on new/removed token directories and aggregate overflow. Deliberate rescan mutation must fail the assertion. |
| 712 | Host status/planning uses presence only, never `lookup`/`-w` to classify a login. | Use existing `has_entry`; test real constructed presence argv with an injected process dependency and no secret flag. |
| 712 | Select Claude Code's configured-directory service. | Reuse `claude_service_for` with raw nonempty `CLAUDE_CONFIG_DIR`, fallback file directory under HOME. Test unrelated default entry alongside a file-backed scoped profile. |
| 712 | Fixture host/Keychain process dependency is injected; temporary HOME cannot consult real Keychain. | Inject the presence function in host runtime unit fixtures and process runner in command-level regression. Audit real-binary host fixture helpers as well as coordinator mocks. |
| 712 | Regression covers file-backed configured profile, unrelated default entry and no `-w`. | Cross-platform synthetic presence cases and macOS command recording exercise the actual shared boundary without starting `security`. |
| 713 | Repair/bootstrap approved npm scope/package publisher and matching PyPI publisher identity. | Document exact owner/repo/workflow/environment, npm initial package bootstrap and pending PyPI publisher. Diagnose access from actual logs. Registry-side account configuration cannot be created with GitHub-only credentials. |
| 713 | Retry existing tag/assets safely, using verified exact distributions. | Add an explicit existing-release retry path that downloads and attests assets, never rebuilds/reuploads them, verifies already published bytes before skipping, and can run current workflow logic against an older tag. |
| 713 | Ordinary exact-version npm/PyPI installs succeed and hashes equal verified assets. | Verify downloaded registry tarball/wheel/sdist hashes and install/import the exact package from the ordinary registry before release promotion. |
| 713 | Publish/verify Rust crate, then stable/latest only after full delivery. | Preserve Rust publication/availability and all existing artifact/lifecycle gates; retry path independently verifies existing release provenance and retains registry failure gates. |
| 713 | Keep fail-closed stable promotion when either registry rejects publication. | Automated workflow/registry rejection, mismatch and retry tests; no unconditional promotion or suppression of publisher errors. |
| 714 | Every accepted instance length (1–32) has bounded Docker DNS names/aliases with uniqueness. | Keep full per-candidate UUID and compact only the instance component with a deterministic digest. Bound local and remote generated backend labels; retain historical default names and existing state references. |
| 714 | Actual Docker tests cover longer named instances and maximum length with hostname relay forwarding. | Add real-image cases at reported 13 and maximum 32 characters; check direct backend hostname and relay health, convergence and owned cleanup. |
| 714 | Unrepresentable instances fail before mutation. | Existing validation rejects invalid/overlong inputs; safe generation validates selection before image/network/state mutations. Add refusal test proving an invalid instance does not create deployment state. |

## Alternatives and existing components

For 711, serializing the suite or increasing ten seconds masks the test boundary. A benchmark can measure performance separately, but deterministic scan counts directly protect the intended algorithm under arbitrary scheduler contention. `std::fs`, the existing per-store mutex and test-only counters suffice; no timing/mock crate is needed. Rust's [test runner documentation](https://doc.rust-lang.org/book/ch11-02-running-tests.html) explains default parallel execution.

For 712, the existing `has_entry`, `claude_service_for`, `HostRuntime` and `OperationContext::ProcessRunner` already provide the needed seams. `security-framework`/`keyring` would add dependencies without removing the requirement to choose presence rather than password retrieval. Keep the repository's existing Security CLI boundary and inject fixtures. Apple's [security manual source](https://github.com/apple-oss-distributions/Security/blob/main/SecurityTool/macOS/security.1) documents `find-generic-password -w` as password-only output. The same audit found the presence-only vendor-store note in `auth clear`; it now uses the configured service and `has_entry` too.

For 714, Docker's [user-defined bridge DNS](https://docs.docker.com/engine/network/drivers/bridge/) resolves container names/aliases; [RFC 1035 section 2.3.4](https://www.rfc-editor.org/rfc/rfc1035#section-2.3.4) limits each DNS label to 63 octets. A short alias would work but adds another persisted routing identity. Compact generated backend names instead, using existing SHA-256 and UUID libraries while keeping network/relay full instance names (already bounded). Docker Compose or Bollard would not fix an overlong generated label by themselves.

For 713, npm's [trusted publisher documentation](https://docs.npmjs.com/trusted-publishers/) requires npm >=11.5.1, Node >=22.14.0 and a matching package publisher. Provenance does not grant scope permission. PyPI's [troubleshooting](https://docs.pypi.org/trusted-publishers/troubleshooting/) identifies the missing publisher mapping; [pending publishers](https://docs.pypi.org/trusted-publishers/creating-a-project-through-oidc/) can bootstrap a project through OIDC. Existing pinned `pypa/gh-action-pypi-publish`, npm CLI, GitHub attestations and Python hashlib/urllib can provide exact distribution retries. Changing to a different registry or publishing locally rebuilt assets would violate acceptance.

## Initial evidence and access limits

Failed tagged workflow [37578930768](https://github.com/link-assistant/router/actions/runs/37578930768) is for d7f602b8c4a920c61ceee1c8017b618cb401126e. Its complete log is retained locally at `ci-logs/release-37578930768.log` (109,000+ lines; targeted reads stay below 1,500 lines). npm E404 is at 109288; PyPI invalid-publisher at 109538, workflow claims at 109553–109555 and missing environment at 109556. Neither successful attestation nor a GitHub admin role grants registry publisher permissions. Repository Actions secret and environment listings are empty; publisher environment variables and npm account configuration are absent locally. Exact npm/PyPI 1.18.2 endpoints returned HTTP 404 during this investigation. No registry repair or successful publication is claimed from these observations.

Previous PRs 710 and 690 establish idempotent release preparation, immutable source identity, release-managed versions, and fail-closed promotion. Add a patch changelog trigger rather than rewriting v1.18.2 or manually changing package versions.

## Reproduction and verification evidence

- `python3 experiments/issue-715/reproduce-host-presence.py` extracts the original and current implementations into an injected process fixture. The original requests `Claude Code-credentials -w` and incorrectly returns Keychain; the fixed helper asks only for `Claude Code-credentials-<profile-hash>` and returns File. No actual `security` process runs.
- `python3 experiments/issue-715/check-accounting-regression.py` compiles the real accounting module and its finite fixtures. Current accounting passes; deliberately forcing full scans on every append fails the deterministic scan assertion.
- `python3 experiments/issue-715/reproduce-dns.py` against the published immutable image reproduces backend lengths 69/88 with loopback health 200 and hostname `ENOTFOUND`. `--fixed --binary target/debug/router` produces length 63 for both 13/32-character instances, backend hostname health 200, relay hostname health 200 and successful relay readiness. All fixture children, containers, networks and root-owned files are cleaned up.
- `python3 experiments/issue-715/check-remote-names.py` executes the actual remote agent's early name boundary for every length 1–32 plus invalid instance/cookie cases. Invalid cases never reach the synthetic mutation marker.
- `python3 experiments/issue-715/test-release-retry.py` checks denied access, mismatched bytes/identity, yanked or incomplete distributions, incorrect source runs and required npm/PyPI/Rust promotion gates.
- The production retry resolver accepted source run 37578930768 at the exact v1.18.2 commit. All five existing integration assets (npm tarball, Python wheel/sdist, contracts archive and checksum manifest) were downloaded and passed `gh attestation verify` with the exact source ref/digest; all four manifest hashes match. Both production registry probes still report `present=false`.
- JavaScript/Node tests (9), Bun tests (9), TypeScript checking, Python package tests (9), generated contract/binding parity, UI build/current bundle, workflow syntax and repository policy checks pass. Full Rust and CI validation is tracked in PR 716.

The combined local libtest compiler/Clippy target exceeds this workspace's 3 GiB cap. Local runners reuse the repository's existing AST compilation sharder with unchanged production logic/test bodies; ordinary CI commands remain unchanged. A sharded Linux result is not evidence that the reported default-parallel full macOS command passed. The PR's macOS CI must establish that result.

The registry-side publisher bootstrap and complete 1.18.2 release delivery remain unfulfilled externally. No owner credential or approved publisher-configuration access is available in this session. The retry workflow and [publisher instructions](../../ci-cd/registry-publishers.md) make the remaining operation concrete, but successful local code checks do not prove registry delivery or stable promotion.

## Component comparison from upstream documentation

| Component | What it provides | Decision |
| --- | --- | --- |
| [security-framework](https://docs.rs/security-framework/latest/security_framework/os/macos/passwords/fn.find_generic_password.html) | Rust bindings to native Keychain lookup, including password and item output. | Keep the existing presence-only CLI boundary; switching libraries would not fix an incorrect lookup operation or profile selection. |
| [keyring-rs](https://github.com/open-source-cooperative/keyring-rs/wiki/Keyring) | Portable OS credential-store backends. | Useful for a future store abstraction; unnecessary for this narrow existing macOS boundary. |
| [Bollard](https://github.com/fussybeaver/bollard) | Typed Rust Docker daemon API. | A client abstraction still needs a valid DNS label; reuse current subprocess/runtime mocks and actual Docker tests. |
| [pypa/gh-action-pypi-publish](https://github.com/pypa/gh-action-pypi-publish) | OIDC publication of built Python distributions. | Retain the existing pinned action, supplying only attested distributions. |
| npm trusted publishing / GitHub attestations | Approved OIDC publisher identity and exact source/asset verification. | Reuse these facilities, with a standard-library hash/install verifier and no new runtime dependency. |
