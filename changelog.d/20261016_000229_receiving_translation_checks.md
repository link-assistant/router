### Tests

- Qualify the complete original namespace parser, conditional namespace syntax,
  static source syntax cache and local/workflow deadline integration: all 55
  cases passed under both Node and Bun with unchanged deadlines and installed
  TypeScript 5.9.3. The nine core deadline controls also passed both engines.
- Retain the preceding failures and complete observer reports. These focused
  results do not establish generated freshness, complete translation, native
  parity or a green full gate. Rust verification remains in CI after every
  JavaScript stage passes for the same commit; no Rust tools ran locally.
