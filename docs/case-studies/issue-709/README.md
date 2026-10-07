# Release preparation and parallel sweep fixtures

Scope: [#709](https://github.com/link-assistant/router/issues/709),
[#707](https://github.com/link-assistant/router/issues/707) and
[#708](https://github.com/link-assistant/router/issues/708), in
[PR #710](https://github.com/link-assistant/router/pull/710).
All three issue bodies and paginated comments were read, as were PR conversation
comments, inline comments and reviews. There were no comments at investigation
time. Both reported defects are reproducible; neither was already resolved.

## Requirements and solution plans

| Source | Requirement | Solution and verification |
| --- | --- | --- |
| #709 | Read every listed issue, including comments. | Read #707 and #708 and all relevant paginated discussion endpoints before implementation. |
| #709 | Address all listed issues in one PR, with no deferred code fixes. | Release preparation, fixture isolation and their regressions share PR #710. |
| #709 | Close the parent and every child with a separate closing keyword. | PR description includes `Fixes #709`, `Fixes #707` and `Fixes #708` on separate lines. |
| #709 | Explicitly identify any already-resolved or unreproducible issue. | Both defects reproduced; execution limits and publication state are reported explicitly. |
| #707 | Existing exact-tag preparation must be idempotent using structured state/errors. | Parse gh stdout for `Release` / `tag_name` / `already_exists`, then require a successful exact-tag GET with a matching tag and release ID. |
| #707 | Arbitrary 422, authentication, network and permission failures must remain failures. | Reject missing, malformed, unrelated and mixed structured errors; propagate failed lookups. Preserve both stderr and stdout in diagnostics. Unit and executable-fixture regressions cover the failure cases. |
| #707 | Preserve existing assets. | Reuse an existing release through a read-only GET; never update, delete or recreate it. Compare complete state bytes before and after repeated preparation. |
| #707 | Preserve complete-delivery and provenance gates. | Keep all packaging, exact-tag/SHA attestations, macOS lifecycle, registry and finalization dependencies. Existing release gate and provenance tests remain enabled. |
| #707 | Never stabilize an incomplete release as a workaround. | New preparation remains `prerelease=true`, `make_latest=false`. Duplicate handling leaves an existing prerelease or stable release exactly as found. |
| #707 | Regress the main-preparation → tag-publication sequence and gh stdout/stderr behavior. | Execute the real script twice against one stateful gh fixture: successful POST, duplicate POST with structured stdout and HTTP-422 stderr, exact-tag GET. Run in the existing release-automation CI step. |
| #707 | Regress ordinary non-duplicate failures. | Executable cases cover generic validation errors, invalid body, wrong duplicate field, mixed errors, credentials, permissions, network messages and deceptive English stderr. |
| #707 | Recover publication of the merged source. | Supply a patch changelog fragment so merging creates a new immutable release containing both fixes. Existing `recover` / exact-tag `publish` dispatch paths then use the corrected shared script. Historical immutable tags still contain the old script; rerunning those workflows cannot apply this PR. |
| #707 | Verify actual platform binaries, images, exact-tag/commit attestations and official language distributions. | Run the existing read-only `check-delivery.rs --verify-artifacts` against the latest merged source; retain its honest partial-publication result. After merge, run it against the merge SHA and inspect all publish jobs. Actual delivery cannot be asserted from an unmerged PR. |
| #708 | Isolate or coordinate fixtures under default parallelism. | Use a unique RAII `TempDir` parent per test. The shared sweep inspects the parent of its reference directory, so tests exercise the real implementation within their own namespace. |
| #708 | Prevent collisions across concurrent test processes. | Random independent parent directories replace every fixed globally shared fixture name. No process-global environment changes or mutex coordination are needed. |
| #708 | Preserve actual locked-file coverage and active-lease assertions. | Keep real `File::lock`, sweep while locked, assert survival, unlock/drop, sweep again, assert deletion. |
| #708 | Preserve stale cleanup and ownership coverage. | Retain the existing stale-PID, self-directory and owner assertions. A deterministic interleaving also requires the competing sweep to clean its own stale fixture. |
| #708 | Repeated default-parallel `with_command` and native verifier runs must pass reliably. | Run finite repeated suites, including simultaneous processes sharing a writable temporary root, and the verifier's affected area. CI retains its ordinary platform suites and adds 20 default-parallel wrapper repetitions on Linux and macOS. |
| User | Apply the requirements everywhere in the codebase. | Trace the shared release helper through automatic, instant, recover, tag publication and orphan backfill callers; audit all fixed dead-PID sweep fixtures, wrapper integration tests and verifier areas. |
| User | Research facts, existing libraries and possible solutions. | Compare the alternatives below using primary documentation and inspect recent related PRs #667, #690, #698 and #706. |
| User/repository | Add an appropriate release trigger. | Add a frontmatter `bump: patch` changelog fragment. CI explicitly rejects manual Cargo version edits; release automation performs the bump. |

## Evidence and root causes

The downloaded [v1.18.0 run](https://github.com/link-assistant/router/actions/runs/37465196056)
fails at `ci-logs/release-37465196056.log:85466`; the
[v1.18.1 run](https://github.com/link-assistant/router/actions/runs/37529611675)
fails at `ci-logs/release-37529611675.log:85315`. Both report
`Error creating release ... gh: Validation Failed (HTTP 422)` after all build
and test gates have passed. Delivery jobs never start.

The real script originally accepted only an English stderr substring. The
credential-free executable regression fails before the fix both when a duplicate
is reported normally and when an unrelated failure happens to contain that
substring. The fixed script reads the structured response and confirms state.

The sweep race is a fixture setup race: a global dead-PID directory is visible
before `.active.lock` is opened and locked. A separate test's ordinary run
creation sweeps it. `experiments/issue-709/sweep-fixture-race.rs` forces this exact
ordering using the actual production implementation, without waiting for chance
scheduling. The new isolated cleanup and interleaving tests fail with the original
global-root implementation and pass with the sibling-root sweep. This evidence
does not establish a production active-lease defect.

Production `DisposableRunDirectory::create` still creates its directory in the
system temporary directory; its parent is therefore the same directory production
previously scanned. Ownership checks, PID checks, real file locking and deletion
behavior are unchanged. Existing wrapper integration fixtures already have unique
suffixes and only assert stale cleanup; they do not expose a leased setup window.
Both `anthropic-mock-contracts` and `zai-only-entitlements` verifier areas call the
same `with_command` suite and therefore receive the fixture fix.

## Researched alternatives

- GitHub's [release REST API](https://docs.github.com/en/rest/releases/releases#get-a-release-by-tag-name)
  supports exact-tag lookup. GET-first creation could avoid duplicate POSTs, but
  still needs duplicate handling for concurrent creators and careful treatment of
  404 versus authorization failures. POST followed by strict duplicate detection
  and GET confirmation handles that race with one shared helper.
- The official [gh api manual](https://cli.github.com/manual/gh_api) describes
  response output. The [CLI implementation](https://github.com/cli/cli/blob/trunk/pkg/cmd/api/api.go)
  separates the response body from its terminal diagnostic, supporting the
  stdout/stderr fixture used here. stderr wording is not an API contract.
- [softprops/action-gh-release](https://github.com/softprops/action-gh-release)
  supports existing releases and asset uploads. Replacing this repository's
  custom preparation with it would introduce release-update behavior and a larger
  workflow migration without improving preservation guarantees. The existing
  helper and missing-assets-only uploader already fit the required delivery gate.
- [tempfile::Builder::tempdir_in](https://docs.rs/tempfile/latest/tempfile/struct.Builder.html#method.tempdir_in)
  and `TempDir` provide unique directories with automatic cleanup. `tempfile` is
  already a dependency, so fixture isolation adds no package.
- [Rust's File locks](https://doc.rust-lang.org/std/fs/struct.File.html#method.lock)
  preserve actual operating-system lease coverage. No mocked lock or extra
  locking library is required.
- [serial_test](https://docs.rs/serial_test/latest/serial_test/) and
  [nextest test groups](https://nexte.st/docs/configuration/test-groups/)
  can coordinate shared resources. Serializing only the two fixtures would leave
  other wrapper tests and independent test processes able to sweep them; grouping
  every caller would add broad scheduling constraints. Independent roots remove
  the shared resource while keeping parallel tests and cleanup coverage.

## Publication boundary

At investigation time, `v1.18.1` was still a prerelease with no assets, npm and
PyPI returned 404 for version 1.18.1, and Docker Hub returned 404 for its tag.
The crates.io API returned 403 from this workspace, so that endpoint cannot prove
crate availability here. The existing delivery audit fails on missing artifacts
before it could verify binaries, images or attestations.

This PR cannot publish its corrected source before merge while preserving the
repository's immutable-tag provenance rules. The patch fragment prepares the next
release. No old tag is moved, no incomplete release is promoted, and no placeholder
page is reported as delivery. Historical recovery and post-merge verification
remain operational work until a release containing the fix has executed.

Reproduction commands and bounded local checks are in
[the retained experiments](../../../experiments/issue-709/README.md).
