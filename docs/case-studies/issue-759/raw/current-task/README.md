# Current task verification evidence

This supplement preserves the exact completed CI collections for Router draft PR #761 cycles 1–5, plus retained local producer and full-stage stdout/stderr receipts. It adds evidence to the dated historical collection; it does not overwrite its population, closure counts, or unknown measurements. Cycle six is still being implemented and is not included as completed evidence.

| Publication cycle | Exact published head | Terminal workflows | Successful / failed / skipped jobs | Runs with unexpected failure evidence |
| --- | --- | --- | --- | --- |
| 1 | `f53d78516721211226b96042576ca82820df75a5` | 10 | 60 / 20 / 42 | 0 |
| 2 | `3164171650d2d9abdc50308ce1c71fa341c7f5ec` | 10 | 60 / 20 / 42 | 6 |
| 3 | `2e53429ad9d0241f4a8b6458b0fcbcfb6b3f9531` | 10 | 60 / 20 / 42 | 0 |
| 4 | `9ba73b5fb41664eb590f278d8321e3943c79b17a` | 10 | 60 / 20 / 42 | 0 |
| 5 | `a81bce206e381241c44e30e960e027574a96bcd3` | 10 | 60 / 20 / 42 | 0 |

All five collections contain all 10 terminal workflows and 122 jobs for their exact head. Strict parity and aggregate readiness remain failed and downstream Rust jobs remain skipped. Cycle 2 also retained six runs with the generation-check deadline failure; the subsequent repair is a separate cycle. None of these cycles establishes full parity, a green readiness stamp, Rust execution, or a first fully green JavaScript-plus-Rust revision.

[index.json](index.json) lists every pack member, original byte length, SHA256, published head, original final report, and log-object mapping. Each cycle retains its original `logs-manifest.json`, run/job inventories, failed-job annotations and compressed content-addressed log objects. All 4,900 log references were decoded and matched to their recorded SHA256 and length during archival. The local pack includes unsuccessful producers and stale-output verification as well as the successful cycle-five producer and full-stage receipts; failed runs are not replaced by later green checks.

Six deterministic content-addressed tar/gzip packs store 5,112 original files using 11,222,556 bytes. Each pack was reopened and every member matched to its index SHA256 without writing extracted copies. The whole case-study file allocation after this supplement is 477,257,728 bytes, below the 500,000,000-byte cap. These are observations at archival time, not a promise that future additions will fit. Packs keep existing gzip objects intact and avoid thousands of additional filesystem allocations.

To inspect a pack, first verify its file SHA256 against `index.json`, then use `tar -tzf <pack>` or extract only the required member into a task-owned temporary directory. Paths are relative and no symlinks are stored. The per-cycle original log manifest maps a GitHub job log's virtual ZIP path to its compressed object member.

The cycle-five measured producer maximum RSS (637,714,432 bytes) and elapsed time (33.624 seconds) describe that one JavaScript translator process. They are not whole-task/process-tree peaks, Rust-build telemetry, CI billing, or comparative savings. The exact command, `/usr/bin/time -l` stderr and receipt are in the local pack. The separately archived [authorized target-cleanup receipt](../sources/local-verification/router-759-root-target-cleanup.json.gz) records only immediate before/after observations; later disk changes are not attributed to that cleanup.
