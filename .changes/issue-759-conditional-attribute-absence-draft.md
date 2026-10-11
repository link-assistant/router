Draft checked cfg_attr absence for explicitly false configuration predicates
and the exact built-in allow(dead_code) lint under either predicate branch.
Verify original Rust 1.89 compiler and parser sources, validate the complete
bounded attribute-input grammar before evaluating its predicate, and retain
all original tokens, positions and conditional evidence. Private absence
certificates let original module, namespace, derive and inner-attribute
consumers exclude unapplied attributes or ignore separately pinned inert lint
alternatives without acquiring general expansion or runtime authority. Unknown
lint predicates stay unknown in the evidence. Other active and unknown
transformations, unsupported syntax and sibling procedural attributes retain
their existing obligations.

The source-only draft includes twelve pending tests with four JavaScript and
strict TypeScript runtime fixtures, plus whole unchanged production source
pins for token_admin and client_lifecycle/active. The real non-test request
derive excludes the conditional Serialize invocation. No compiler tests,
producer, full gate or Rust build have run for this draft yet.
