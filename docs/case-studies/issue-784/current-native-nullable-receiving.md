# Nullable fixture compilation

Draft receiving repair for [PR #785](https://github.com/link-assistant/router/pull/785).
At published head `a598d2b01b5a8e47bbf6bb5a8f90b317d90ce5de`, the complete
Bun shard records the first nullable case at 5,205.27 ms against its original
5,000 ms limit. The complete local original file reproduces that failure at
7,711.43 ms; all four remaining cases pass.

The test now analyzes all four complete original parents through the existing
independent-corpus API. Each retains the default independent frontend and scoped
retries, with fresh source associations and a shared serialized/reparsed CST
packet. The lexical representation grants no semantic or executable authority.
All original signatures, meta checks, Rust and TypeScript expectations, dynamic
neighbor refusals and JavaScript/IR/compiled-TypeScript golden inputs remain.

All four independent target modules enter one fresh strict TypeScript program.
The program explicitly checks the full ES2022 standard library used by these
Node fixtures; the previous implicit browser library set is no longer loaded.
Strictness and library checking remain enabled, and no compiler verdict is
cached. Every complete original and generated fixture still executes.
Optional phase tracing is off unless `ROUTER_NATIVE_NULLABLE_PHASE_TRACE=1`.

The complete final file passes five cases in Node 20.20.2 and Bun 1.4.4 with
lockfile-installed TypeScript 5.9.3. Node's independent deadline audit passes;
Bun's first case takes 4,580.40 ms within the unchanged 5,000 ms deadline.
Whole observed runs take 12.821632 and 10.264135 seconds, respectively, with
sampled total cgroup peaks of 1,642,291,200 and 1,659,154,432 bytes. These
observations are not a controlled benchmark or a guarantee for CI's Bun 1.4.3.

The [42-member archive](evidence/current-native-nullable-receiving.tar.gz) and
[whole receipt](evidence/current-native-nullable-receiving.json.gz) preserve
the complete original and final test, all four complete application parents,
eight whole runs, both complete Node audit directories and the relevant source
inputs. Four unsuccessful intermediate runs are retained, including the
default-off attempt at 5,518.19 ms; the earlier traced pass alone did not qualify
that draft. Every archive member was independently read back and hashed.
The archive is 103,949 bytes, SHA-256
`624d6d652627040e27b228a83d63b500979bb5219230d3c568450d8f99b43691`.
All observed children have exited and been reaped. Raw evidence is retained.

This test-only change does not alter compiler registration or establish a
production-function gain. The complete gate, canonical and matrix generation,
other original deadlines, strict parity and universal privacy remain open.
No local Rust tool was invoked.
