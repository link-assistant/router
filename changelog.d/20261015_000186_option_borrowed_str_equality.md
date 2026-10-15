### Added

- Draft a source-driven language substitution for equality of genuine core
  `Option<&str>` values. It selects the complete original four-arm `PartialEq`
  method, retains the lang-trait/prelude/reference/string source routes, and
  checks that method through private shared-parameter tuple and pattern
  contexts. Both actual operands are evaluated once in source order through
  ordinary checked bindings; no tagged-object equality runtime is added.
- Add a complete eight-case JavaScript/strict-TypeScript test file, including
  unchanged original Telegram and Qwen caller contexts, Unicode and NUL,
  `Some`/`None`, operand effects, source ownership and proof mutation controls.
  Add CI-only Cargo integration source for the actual public Telegram caller.

This is an **unverified source draft**. No JavaScript, TypeScript or Rust test
has been run for this change. Production gains and current-project admission
are unmeasured. Other payloads, `!=`, arbitrary reference/tuple contexts,
unknown expansions and whole-core trait/namespace closure remain outside this
rule. Existing output observers grant no admission authority. Repository
formatting remains in the separate repository rule phase.
