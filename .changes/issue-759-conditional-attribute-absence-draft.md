Draft checked cfg_attr absence for explicitly false configuration predicates.
Verify original Rust 1.89 compiler and parser sources, validate the complete
bounded attribute-input grammar before evaluating its predicate, and retain
all original tokens, positions and conditional evidence. Private absence
certificates let original module, namespace, derive and inner-attribute
consumers exclude unapplied attributes without acquiring expansion or runtime
authority. Active and unknown predicates, unsupported syntax and sibling
procedural attributes retain their existing obligations.

The source-only draft includes nine pending tests with three JavaScript and
strict TypeScript runtime fixtures, plus whole unchanged production source
pins for token_admin and client_lifecycle/active. The real non-test request
derive excludes the conditional Serialize invocation. No compiler tests,
producer, full gate or Rust build have run for this draft yet.
