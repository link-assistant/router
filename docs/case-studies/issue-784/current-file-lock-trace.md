# Optional advisory lock diagnostics

[PR #785](https://github.com/link-assistant/router/pull/785) adds default-off
`ROUTER_FILE_LOCK_TRACE=1` scalar timing records for helper startup, acquisition,
operation and release. Records omit paths, contents and credentials. Synchronous
trace write failures preserve the operation result or original error and allow
helper cleanup. The existing OS locking and deadlines remain unchanged.

The complete regression file first reproduced serialization of a caller's
non-boolean `shared` object: its `toJSON` ran eight times. Converting that field
to Boolean avoids the call. Both complete storage/OAuth files then pass all
17 cases in Node 20.20.2 and Bun 1.4.4; the independent Node deadline audit also
passes. Three lock operations release successfully even when writes throw at
acquisition, operation completion and helper closure.

The actual native producer regenerated three artifacts (11591744 complete
bytes), followed by zero changed/unexpected artifacts in mandatory freshness
mode. Strict compilation passes all 167 files using installed TypeScript 5.9.3.
The [complete packet](evidence/current-file-lock-trace-v2.tar.gz) and
[receipt](evidence/current-file-lock-trace-v2.json.gz) preserve predecessors, failed
and passed streams, resource observations and complete independent audits.
The initial retainer included its own still-open report before writing the
report's final line. That packet, retainer and completed report are preserved
in the corrected packet, whose own open report is excluded.

The earlier complete Bun diagnostic run passed 259 native cases and observed
287 lock attempts without forced release. It did not reproduce CI's intermittent
persistence timeouts. This diagnostics change does not establish their repair,
full-gate success, parity or issue completion.
