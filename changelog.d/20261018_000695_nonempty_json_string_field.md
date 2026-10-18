### Added

- Add an explicit nonempty JSON string-field definition format using the existing
  get/as_str runtime readers and checked Some dominance. Original, target and
  fresh lowering independently reissue the private pinned Option filter before
  checking its exact same-binding shared-str nonempty predicate. Public optional
  input refusals and legacy formats remain unchanged.
- Retain real bridge-request/chat-input source functions, complete CST/meta and
  reverse checks, hostile/refusal controls and CI-only native edge goldens.
  The changed Rust parent requires an actual source-bank refresh before
  receiving; source authoring establishes no executable gain or performance pass.
