# Complete compiler failure diagnostics

Published `567e1dd0b` shard 1 fails strict TypeScript in
`option-borrowed-str-equality.test.mjs` at log lines 1820–1833, but the TAP
exception rendering omits the child stdout containing the actual compiler
diagnostic. Shard 6's ActivityPub assertion at line 1996 renders only its first
10,000 characters and explicitly omits another **1,484,216 characters**.
The complete downloaded log is retained; it does not contain the omitted
refusals. Their actual target-specific cause remains unobserved.

`ROUTER_TRANSLATION_TYPED_TARGET_TRACE=1` enables a failure-only JSON diagnostic
in the shared receiving harness. It records the exact command/arguments,
phase, exit status, signal and complete stdout/stderr bytes in base64 before
rethrowing the original child error. It defaults off. The CI translation step
enables it while retaining its exact complete-file command, concurrency and
existing limits. Diagnostic writes cannot replace the original compiler error.

The two original large-project assertions now render their relevant function's
refusals rather than a truncated unrelated report. Their full source inputs,
project compilation, assertions, complete optional vectors and deadlines remain
unchanged. Those large files were syntax checked, **not rerun** in this batch;
this diagnostic change does not fix or qualify their underlying failures.

All three whole-file compiler receiving cases pass in Node **20.20.2** and
Bun **1.4.4**, using TypeScript **5.9.3**. The invalid-TypeScript case exercises
both trace settings and independently compares every decoded stdout/stderr
byte against the original rejected error. Neither runtime verification callback
runs on failure. Node's independent original-deadline audit passes and closes
its child group. Whole commands take **7.283** and **4.946** seconds, with peak
sampled cgroup use **2,322,296,832** and **2,251,722,752** bytes. The structural
workflow checker passes for all **14** workflows.

The [complete packet](evidence/current-typed-target-trace.json.gz) retains
**27 whole members / 60,288 compressed bytes**, including complete published
before/current files, workflow sources, streams, resource receipts and deadline
audit. All members decode and match their complete lengths/SHA256. Capture
measures **481,691,855 bytes** across four evidence roots. New executable
production functions: **zero**. Full gate, parity and CI remain failed or
unfinished. No local Rust command ran.
