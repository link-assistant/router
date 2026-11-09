# Optional complete-gate fingerprint trace

[PR #785](https://github.com/link-assistant/router/pull/785) remains unfinished.
`ROUTER_JS_FIRST_FINGERPRINT_PROGRESS=1` now enables scalar JSON diagnostics on
stderr while the local JavaScript gate fingerprints its complete source tree.
Tracing is off by default. It reports every 512 completed inputs and immediately
before and after inputs of at least 8 MiB, with path, byte counters and Node
memory observations. It omits source contents. The original Git input discovery,
64 KiB hashing buffer, content/mode/link/deletion framing and all stage commands
are unchanged. The exported helper also accepts an optional progress callback;
callback failures propagate unchanged.

Both complete receiving files pass under Node 20.20.2 with TypeScript 5.9.3:
13 cases, 22.301 seconds, independent deadline audit passed, no resource stop,
sampled cgroup peak 2,339,368,960 bytes. Regressions compare enabled and disabled
hashes with independently framed expected content, retain the original streaming
and long-index checks, and verify large-input progress and callback failure.
The complete packet also retains the first resource-stopped attempt, a passing
10-case run whose audit failed because an imported file was not preselected,
and the subsequent qualified 12-case run before the large-input case was added.

The actual traced gate still fails at the unchanged 2,866,933,760-byte cgroup
guard: 31.293 seconds, sampled peak 2,871,042,048 bytes. The last complete trace
record reports 45,056 completed inputs and 1,643,820,169 content bytes from a
49,080-path discovery. At that point Node reports RSS 75,915,264 bytes and heap
used 21,909,320 bytes. These are trace samples, not an exact final processed
input or a complete process peak. The trace does not prove the remaining
container memory's cause. All seven gate stages are unrun and no stamp is
written. The optional large-file cache advice does not resolve this failure.

The preceding untraced large-file-advice gate also failed: 35.601 seconds,
sampled peak 2,874,527,744 bytes, eight completed advice passes, zero stage
output. Its finite controls remain separate passing evidence.
The [whole diagnostic packet](https://github.com/link-assistant/router/blob/74f62c037a21e4b3e4e3804dcf3d941d0aabfe19/docs/case-studies/issue-784/evidence/current-fingerprint-trace.json.gz?raw=true)
retains both complete gate streams, all advice receipts, every focused attempt
and audit, before/after source and exact harnesses. It is not an immutable
gate-launch snapshot or a full-gate qualification. No Rust tool was run.
