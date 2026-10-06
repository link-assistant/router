# Soak fixture retention and missing RSS measurements

Issue: https://github.com/link-assistant/router/issues/705
Pull request: https://github.com/link-assistant/router/pull/706

## Failure evidence

The [scheduled Linux release run](https://github.com/link-assistant/router/actions/runs/37455818045)
ran for 600 seconds at concurrency 16. Its full log is preserved locally in
`ci-logs/soak-37455818045.log`. Lines 1124–1126 report 16,684 successful
requests, zero failures, descriptors 92 → 92, tasks 84 → 84, and RSS
60,164 → 434,588 KiB. Growth was 374,424 KiB against a 65,536 KiB allowance.

`StubState.requests` retained a header map, raw bytes and parsed JSON for every
upstream request. Clearing that collection after `drive()` did not bound
retention during the run and did not force the allocator to release resident
pages. The original guard also silently omitted the RSS assertion whenever
either `/proc` measurement was unavailable, including on macOS.

## Automated reproduction

Before changing recording or the memory guard, the regressions were run with
the v1.18.0 Router implementation:

```sh
CARGO_BUILD_JOBS=1 cargo test --locked --test soak_test -- --nocapture
```

`ci-logs/soak-baseline-regressions.log` records three failures:

- `soak_fixture_does_not_retain_requests` sends each of the four request modes
  twice, then observes retained upstream requests before `drive()` can clear
  them. All eight requests complete successfully.
- `memory_guard_rejects_missing_baseline` and
  `memory_guard_rejects_missing_final_sample` do not panic as required: the
  original conditional assertion treats missing measurements as success.

`replay_fixture_records_requests_by_default` already passes before the fix.
It asserts two complete requests, including path, headers, exact raw JSON
bytes, parsed JSON, repeating upstream replies and `clear_requests()`.
Both request regressions have a 15-second deadline.

After the fix, run the regressions and all existing recorder consumers:

```sh
CARGO_BUILD_JOBS=1 cargo test --locked \
  --test soak_test --test vendor_fixture_replay_test \
  --test claude_code_feature_matrix_test -- --nocapture
```

Additional regressions cover the unchanged 64 MiB boundary, rejection of
65,537 KiB growth, falling RSS, invalid/absent/zero samples, and actual RSS
measurement on supported platforms. The `/bin/ps` command and parser are also
exercised on Linux. macOS `ps` reports RSS in 1024-byte units, as specified by
[Apple's ps manual](https://github.com/apple-oss-distributions/adv_cmds/blob/main/ps/ps.1).

## Ten-minute release gate

Build the unchanged release profile first, then run the existing gate with a
finite duration and a process virtual-memory cap. The cap applies to the test
run, after compilation; the measured growth budget remains 64 MiB.

```sh
CARGO_BUILD_JOBS=1 cargo test --locked --release --test soak_test --no-run
(
  ulimit -v 2097152
  SOAK_SECONDS=600 SOAK_CONCURRENCY=16 CARGO_BUILD_JOBS=1 \
    cargo test --locked --release --test soak_test -- --ignored --nocapture
)
```

The Soak workflow exercises Linux and macOS in release mode, preserving the
full output as separate artifacts even on failure. Missing RSS samples fail
with "resident memory bound unproven". Descriptor checks remain Linux-only;
their absence is explicitly reported as an unproven connection bound.
Diagnostics include platform, duration, concurrency, all four request counts,
failures, RSS baseline/final/growth/allowance, descriptors, tasks, and every
token's used/reserved accounting before assertions.

## Local verification in a limited workspace

This workspace has approximately 3 GiB of memory. Use one compiler job. The
existing unit-test sharding tools keep compilation bounded without modifying
repository sources or production logic:

```sh
CARGO_BUILD_JOBS=1 rust-script experiments/issue-703/shard-unit-tests.rs
python3 experiments/issue-703/run-unit-shards.py
```

CI runs the ordinary, unsharded unit suite on Linux, macOS and Windows.
Full command output and downloaded CI logs stay in the ignored `ci-logs/`
directory. The initial prepared-commit pipeline failed only because its PR
had no changelog fragment (`pipeline-37504799417.log`, lines 6728–6742);
the patch fragment supplies the automatic release trigger.
