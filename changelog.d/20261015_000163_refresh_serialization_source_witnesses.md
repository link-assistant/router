### Changed

- Refreshed both serialization registries after the coordinated source batch.
  Both write commands, both freshness checks and both strict TypeScript checks
  passed. Native JavaScript and TypeScript descriptor bytes stayed identical;
  every existing bulk runtime projection stayed equal in JavaScript and executed
  TypeScript. Updated source witnesses do not establish full serde or Router
  runtime parity. No Rust tools ran locally.
