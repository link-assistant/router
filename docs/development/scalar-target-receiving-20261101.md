# Scalar emitted-target receiving cases — source draft

`tools/translation/test/scalar-target-receiving-20261101.mjs` drafts actual
receiving execution for primitive vector, callback and chain proposals. It writes
the complete supplied JS/TS runtime/declaration/dependency closure and exact
canonical artifacts into separate fresh temporary JS and TS trees, retaining
their original paths and import specifiers. It writes no repository output and
uses no repository runtime symlinks. The selected pair is replaced only inside
the disposable trees; authored receiving inputs stay unchanged.

The harness requires the installed package and lockfile to both name TypeScript
5.9.3 and records the actual compiler's exact `Version 5.9.3` output. The existing
explicit `ROUTER_TRANSLATION_TSC` override remains mandatory when provided; it
must report the same version. Otherwise it runs the lockfile-installed compiler
script with the current Node/Bun executable. There is no ambient compiler or
installation fallback. Compilation keeps `--strict --skipLibCheck --target
ES2022 --module NodeNext --moduleResolution NodeNext` and the actual root/output
paths. A separate current-engine process then imports and tests emitted JS, and
another imports and tests the separately compiled TS. Independent authored
literal expectations are the oracle; interpreters are not the target oracle.

Each original 60-second case includes proposal creation, source materialization,
compiler-version observation, strict compilation, both target child processes
and cleanup. Child commands retain the earlier 20-second bound and use only the
remaining original case budget when shorter. Receipts include exact executable,
arguments, engine/version, status/signal, raw stdout/stderr, elapsed/deadline and
compiler metadata. Synchronous completion past a deadline fails. Timeout or raw
output overflow cannot qualify success; the receipt explicitly marks incomplete
streams. Raw output is bounded at 8 MiB per child. Final cleanup runs on success
and failure and preserves the primary failure and its attached full evidence.

Source closure is bounded to 2,048 files and 16 MiB source bytes, temporary disk
to 64 MiB (checked after compilation and execution), and physical traversal to
8,192 files/depth 64 with no symlinks. Safe relative paths and case collisions
are checked before writes. Output diagnostics and full receipts are emitted as
test diagnostics before temporary cleanup evidence is lost. These are test
resource fences, not semantic or runtime authority. Child file output can only
be accounted after the child returns; the existing outer bounded CI process
remains necessary for process/memory/disk enforcement during execution.

`scalar-target-receiving-20261101.test.mjs` retains complete cases for all three
families, both ownership profiles and both original source languages. Each tests
actual JS and compiled TS at the full 4,096-value bound, empty inputs, bool/u64
edges, frozen outputs, overcapacity and real runtime carrier refusals. Kernel
cases include malformed/sparse/unfrozen/accessor/proxy carriers without invoking
getters/traps. Chain cases distinguish a later first-stage overflow from an
earlier second-stage division-by-zero that fusion would expose. A compiler-fail
case retains real strict diagnostics, version, status and cleanup evidence.

The new complete test file is discovered by the existing Node translation cohort
and fresh-process Bun forward-file discovery; no command partition or deadline
was edited. Actual future Node/Bun scheduling/results remain unqualified.

Source review identifies existing potential performance costs: vector pushes
copy and validate prior elements; later chain `get` calls validate complete
intermediate vectors. Full-capacity materialized chains can therefore perform
quadratic work, in addition to fresh source/context/meta checks and strict
compilation. The draft preserves full workloads and the original 60/20-second
limits. No receiving, elapsed-time or speed claim is supported until those exact
cases execute. A deadline failure must be reported and repaired, not hidden by
smaller inputs, filtered files or larger limits.

All new harness/case/parser/compiler/translator/runtime execution is **UNRUN**.
No CI/review feedback was inspected. Existing original-array ownership/input
contract limitations, broader callback ownership, production/export adoption,
full synchronization and parity remain open.
