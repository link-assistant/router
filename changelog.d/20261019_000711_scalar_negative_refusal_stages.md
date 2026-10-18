### Fixed

- Keep scalar-fold negative assertions outside the compiler-exception catch, so an admitted scalar row cannot be disguised as a refusal.
- Require a genuine compile-stage or projection-stage refusal matching the fixture function in src/lib.rs; unrelated facade diagnostics cannot satisfy the test.
- Retain all six unchanged negative sources, complete stage diagnostics/results and raw errors, the positive workload, other seven callbacks and original deadlines.
