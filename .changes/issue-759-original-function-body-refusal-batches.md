Draft optional original free-function body-refusal batching in the reusable
Rust → checked meta → JavaScript/TypeScript project translator. Only attributed
semantic errors in actual source functions are collected. The failed checker is
discarded before IR, recursion, lifetime, constant and source-link proofs can
finish; survivors and callers are checked again. Generated functions, methods,
constants, unattributed errors and internal exceptions keep ordinary behavior.
Ordinary checking and the default direct project checker retain first body errors;
the bulk project path enables the bounded collection, with an explicit false
option for comparison. Pinned vendor bytes remain unchanged.

Eight authored cases are UNRUN. This source-only draft claims no measured speedup,
corpus gain, complete JavaScript gate, native parity or Rust verification.
