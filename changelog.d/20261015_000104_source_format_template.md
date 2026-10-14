### Changed

- Execute bounded original Rust format-parser, literal-escaper and ASCII
  identifier helper control to produce implicit capture pieces and UTF8 literal
  origin ranges. The production formatter consumes genuine private execution
  results while the existing checker resolves caller bindings and checks
  primitive Display. Explicit arguments, format options and other existing
  formatting contracts keep their separate route. Copied proofs, unresolved
  helpers and unsupported source syntax cannot acquire execution authority;
  serde Value formatting and enclosing native methods remain unproved.
