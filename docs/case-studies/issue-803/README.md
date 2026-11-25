# Issue 803: Darwin release artifact jobs time out in `Build release binaries`

Issue: [#803](https://github.com/link-assistant/router/issues/803).
Delivery: [PR #804](https://github.com/link-assistant/router/pull/804).
Research date: 2026-11-25 UTC.

## Symptom

Release run [45601238183](https://github.com/link-assistant/router/actions/runs/45601238183)
(`v1.25.3`) cancelled both Darwin legs of `publish-release-artifacts` at the
job's `timeout-minutes: 30`. Both were still in `Build release binaries`. The
SBOM, attestation and upload steps were skipped. `verify-release-provenance`,
`verify-macos-client-lifecycle`, `publish-npm` and `publish-python` never ran.
The Linux legs passed, including the CycloneDX path fixed by #802.

## Timeline from the job logs

Timestamps come from the job step API and the downloaded job logs
(`gh run view 45601238183 --job <id> --log`).

| Leg | Job start | Build start | Last dependency compiled | `link-assistant-router` starts | Cancelled |
| --- | --- | --- | --- | --- | --- |
| darwin-arm64 | 12:14:31 | 12:18:05 | 12:22:14 | 12:21:42 | 12:44:45 (build still running) |
| darwin-amd64 | 12:27:32 | 12:31:53 | 12:36:01 | 12:35:22 | 12:57:45 (build still running) |
| linux-arm64 | 12:14:02 | 12:15:39 | ~12:17:02 | 12:17:02 | build finished 12:23:44 (`8m 04s`) |

On Darwin, all third-party crates finish in about four minutes. After that the
log is silent for 22–23 minutes while rustc compiles the
`link-assistant-router` crate and runs its LTO links. On `linux-arm64` the
same phase takes about 6.7 minutes.

## Root cause

The workspace release profile (`Cargo.toml`) is:

```toml
[profile.release]
lto = true
codegen-units = 1
strip = true
```

`lto = true` is fat LTO. With `codegen-units = 1`, optimization of the
~214,000-line library crate runs on a single thread. Each of the three
`[[bin]]` targets (`router`, `link-assistant-router`, `with-router`) then
runs its own whole-program LTO link. On the GitHub macOS runner this phase is
about three times slower than on the Linux runners. The Darwin legs had been
taking almost the whole shared 30-minute job budget for several releases:

| Release run | darwin-arm64 build | darwin-amd64 build | linux build (both) |
| --- | --- | --- | --- |
| `v1.25.1` [45508961771](https://github.com/link-assistant/router/actions/runs/45508961771) | 23m30s | 21m09s | 7m53s / 7m53s |
| `v1.25.2` [45518475093](https://github.com/link-assistant/router/actions/runs/45518475093) | 26m56s (job then cancelled at 30m22s) | 23m26s | 7m29s / 9m29s |
| `v1.25.3` [45601238183](https://github.com/link-assistant/router/actions/runs/45601238183) | > 26m40s (cancelled) | > 25m52s (cancelled) | 8m05s / 7m54s |

In `v1.25.1` and `v1.25.2` the Darwin builds finished, and the legs then
failed at the SBOM `mv` (issue #801). So the timeout was not the first visible
error. Even then, `v1.25.2` darwin-arm64 used up the remaining three minutes
during packaging and was cancelled. Once #802 fixed the SBOM path, the build
time became the first failure.

An independent data point uses the same profile. The scheduled `soak.yml` run
[45635711341](https://github.com/link-assistant/router/actions/runs/45635711341)
compiles the library and one test target with `cargo test --release`. In that
run the `link-assistant-router` phase took 22m50s on `macos-15` and 7m51s on
`ubuntu-24.04`.

## Experiment on the release runner

The temporary workflow `experiment-issue-803-darwin-build.yml` (kept as
`experiments/issue-803/darwin-build-timing.workflow.yml`) ran the exact release
build command, `cargo build --locked --release --bins --target <target>`, on
`macos-26` under `/usr/bin/time -l`. It sampled `vm.swapusage` and
`memory_pressure` every minute. Run
[45645554121](https://github.com/link-assistant/router/actions/runs/45645554121):

| Measurement | darwin-arm64 | darwin-amd64 |
| --- | --- | --- |
| Runner hardware | Apple M1 (Virtual), 3 vCPU, 7 GiB | same |
| Checkout | 1m17s | 11m29s (15:42:01 → 15:53:30) |
| Release build (wall) | 36m23s (2183 s) | 20m26s (1226 s) |
| CPU user / sys | 2287 s / 1001 s | 1840 s / 426 s |
| Max RSS of one process | 2.7 GB | 3.06 GB |
| Swap | grew from 0 to 3 GiB (2.1 GiB used) between 16:09 and 16:15, during the parallel LTO links | none |
| `cargo install cargo-cyclonedx` | 107 s | 105 s |

The debug build of `host_client_lifecycle_test` (the `verify-macos-client-lifecycle`
job) took 4m51s on the same runner. That job's 30-minute limit is not at risk,
so it is unchanged.

Conclusions:

- The build is CPU-bound on three virtual cores. On arm64 it also hits memory
  pressure when the three fat-LTO links run in parallel. The high system time
  (1001 s) and the swap growth show the VM paging during the final links.
- Build time varies a lot between runs on the same image: 20 to 37 minutes in
  this run alone, against 21 to 27 minutes in earlier releases.
- Checkout is not always quick. 11.5 minutes on one leg would by itself have
  pushed even a 27-minute build past the old 30-minute limit.
- The macOS jobs started one after the other, not in parallel. This matches the
  13-minute delay of `darwin-amd64` on `v1.25.3`. Queueing does not count
  against `timeout-minutes`, which starts when the job starts.

## Fix

`publish-release-artifacts` now sets `timeout-minutes` per matrix leg:

- Linux legs keep 30 minutes. Their build takes about 8 minutes, so a hang
  still surfaces quickly.
- Darwin legs get 90 minutes. The measured worst case above is about 54
  minutes: a 36-minute arm64 build, an 11.5-minute checkout, a few minutes
  of toolchain setup, a 2-minute CycloneDX install, and packaging, attestation
  and upload. 90 minutes leaves room for a slower VM and for crate growth. A
  real hang is still cut off well before the 6-hour GitHub default.

The release profile is unchanged. Changing LTO or codegen units would change
the shipped binaries, and the issue does not ask for that.

A Rust build cache was considered and rejected for this job. The job produces
attested release artifacts from a tag. A tag run can only restore caches
written on the default branch, so a cache would bring outputs from another ref
into signed binaries. It would also help only when such a cache exists.

## Verification

- `rust/tests/ci_regressions_test.rs::darwin_release_artifact_legs_have_room_to_finish_the_release_build`
  requires the job-level `timeout-minutes: ${{ matrix.timeout-minutes }}`, a
  numeric deadline on every leg, at least 75 minutes for both Darwin legs and
  30–45 minutes for Linux. Local Rust tools are not run in this repository
  (`AGENTS.md`), so CI runs the test. Its Node replica,
  `experiments/issue-803/check-release-timeouts.mjs`, fails against the
  previous `release.yml` with seven violations and passes against the fixed
  one.
- `scripts/check-release-workflow.rs` requires the matrix deadline snippet.
- `actionlint` 1.7.12 reports no findings for `release.yml`.
- `node scripts/check-manual-development-workflows.mjs` passes.
- The real proof is the next tagged release. Both Darwin legs must finish the
  build and reach `Package binaries, checksums, and CycloneDX SBOM`. That only
  happens on a release tag, after merge.
