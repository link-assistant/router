# Preserve complete matrix diagnostics under pipe pressure

For [PR #785](https://github.com/link-assistant/router/pull/785), published head
`124edb33e096a2c018caf449214005ad555d8bdd` fails its owned profile matrix because
the worker's synchronous descriptor-3 write throws `EAGAIN`. The complete job
log, job `130426613267`, records that error at line 5786 and process exit 1 at
line 5793. The missing draft artifacts reported afterward are a consequence.

The shared writer retries `EAGAIN`, `EWOULDBLOCK` and `EINTR`, advances by actual
UTF8 byte counts after short writes and sleeps for at most one millisecond
between attempts. It preserves each complete diagnostic record in order. It
checks the worker's original absolute one-hour deadline before and after writes;
the original parent process deadline also remains active. Permanent descriptor
errors still propagate. The original private planner, corpus comparison, source
equations, output validation and application are unchanged.

The original owned-field producer reproduces all nine outputs. The current
native producer reproduces seven complete predecessor and seven current
equations, including their serialized/reparsed CST, native bindings and checked
inverse. Only the two copied profile workers change. This is actual producer
output; their source and proof pins were not edited independently. The native
freshness CLI subsequently passes for all seven installed files in 107.717841
seconds, with peak sampled total cgroup use of 1955278848 bytes.

The new finite regression reproduces pressure on a real inherited nonblocking
pipe, checks all 1831200 Unicode bytes, verifies the exact completed prefix on
deadline failure and checks permanent `EBADF` propagation. Each child has a
64 MiB heap argument and a five-second watchdog. The original integration file
remains complete, with its original case deadlines and assertions.

| Complete original and new files | Cases | Elapsed seconds | Peak sampled cgroup bytes |
| --- | --- | --- | --- |
| Node 20.20.2 | 5/5 | 8.974174 | 2323181568 |
| Bun 1.4.4 | 5/5 | 8.620222 | 2301599744 |

The independent Node deadline audit passes. The repository compiler is the
lockfile-installed TypeScript 5.9.3. CI uses Bun 1.4.3, so this local result does
not qualify that later CI execution.

All failed diagnostic attempts remain evidence. The first pipe probe used a
blocking descriptor and did not reproduce the error; the corrected finite probe
does. Early Bun fixtures incorrectly assumed that an extra spawn stdio slot was
preserved and closed descriptor 3 before Bun initialized stdout. The final test
uses the actual shell stderr duplication and initializes stdout first. Two
native installation attempts correctly refused the older current afterimage;
the successful installer independently reproduces both complete cohorts. The
first integration attempt also correctly refused the new untracked helper;
the original fingerprint check passes after that production input is staged.
Earlier evolving harness versions are not reconstructed or claimed as captured.

Complete logs, observer receipts, Node audits and final harness sources are in
[the trace packet](evidence/matrix-trace-repair-20261111.json.gz). The
[nine-output owned proposal](evidence/current-124-matrix-trace-owned-proposal.json.gz)
and [complete native predecessor/current proposal](evidence/current-124-matrix-trace-native-proposal.json.gz)
retain full source, not hashes alone. Every retained member and both complete
proposals undergo decoded length/hash readback. Two large failed diagnostic logs
are retained whole as verified gzip files; only their terminal raw duplicates
were retired.

Separately, two inactive task archives were retired after whole local and
published Git blob equality checks. The
[original receipt](evidence/matrix-repair-published-retirement-20261111.json.gz)
and [completion receipt](evidence/matrix-repair-published-retirement-complete-20261111.json.gz)
record 12897752 logical and 12898304 allocated bytes reclaimed. Historical report
links now resolve to the complete immutable published archives. No build cache,
active path or other task's file was removed. The initial cleanup attempt read
the predecessor plan path and refused before changing any file; its full error
and source are retained in the trace packet.

This batch adds zero executable production functions and establishes no new
semantic authority. The isolated compiler registration predates these trace
inputs and needs another genuine refresh. The published CI cycle is still
incomplete, and source-size admission, original deadline failures, canonical
generation, strict parity, the complete gate and remaining issue #784 privacy
criteria remain unfinished. No Rust tool was invoked.
