# Measure complete forward files in fresh Bun processes

Run `node scripts/run-bun-forward-files.mjs --output /absolute/new/evidence-directory`
from the repository root. Node and Python 3 coordinate one fresh `bun test ./FILE`
process for every discovered `*.test.mjs` in `tools/translation/test` and
`tools/translation/serialization-schema`. Files run sequentially, without test
name filters or changes to Bun's default five-second case deadline or declared
case limits. `--root` selects an entire repository; `--bun` selects its Bun
executable. There is no command-line deadline increase.

The entire run has a 2400-second budget, including initial input discovery.
Timed-out children receive termination, followed by forced termination after
at most two seconds. Owned process groups are cleaned up and the measurement
leaf and Bun child are reaped. Final evidence capture and termination cleanup
can extend beyond the execution budget. Every remaining file becomes an
explicit mandatory unrun failure when the budget expires or the coordinator
is interrupted. A failed file does not prevent later files from running.
Files discovered only at completion are also explicit failures.

Each file retains its exact command, full streamed stdout and stderr, exit
status, elapsed time and resource receipt. `wait4` reports that Bun child's
maximum RSS and CPU usage, including its waited descendants; it does not
report concurrent aggregate RSS or Node/Python coordinator memory. Platforms
without `wait4` retain null resource observations. Process-group cleanup uses
the platform's process-group support; unsupported platforms cannot supply
that Unix isolation guarantee. Node coordinator `process.resourceUsage` and
Python `RUSAGE_SELF` observations are recorded separately.

One complete input vector is captured before all files and another afterward.
Vectors include tracked and unignored compiler scripts plus original Rust and
Cargo inputs. Missing sparse-checkout inputs use their exact HEAD blobs and
record this storage source separately. Generated translation output trees are
excluded. Changed bytes, HEAD, discovery or storage state prevent success.
Evidence paths must be new, and raw logs are hashed by streaming reads.
Targeted PATH and existing TypeScript override values, resolved executable
paths and TypeScript package version/hash are captured before and after.
Python records its actual runtime version, Node records `process.versions`,
and each Bun raw version header remains an observation in its child receipt.
This does not change compiler selection or launch extra version subprocesses.

This is an additional complete-file resource verification tool. Existing gate,
workflow, reverse compiler and native Bun commands remain mandatory and
unchanged. A successful receipt does not establish whole runtime parity,
Rust verification, or memory savings against a different workload.
