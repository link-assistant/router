### Changed

- Draft independent bounded weak cohorts for fully completed native-data freeze
  records: 1024 whole-call roots, 2048 descendants of at least 64 logical cells,
  and 1024 smaller descendants. The total remains 4096 scalar-only weak records.
  Lookup checks every cohort without promoting hits. Full prevalidation, every
  shared incoming height/cell charge, existing unique/own-cell/depth limits,
  exact native guard and original whole-input fallback remain unchanged.
- Retain the complete 233 helper/license baseline and add three independent
  native-coverage and full-data controls for retention, threshold/rotation
  separation and shared-bound refusals. Existing eight-case and whole-13 tests
  remain byte-exact. This source-only candidate is UNRUN; structural retained
  sharing motivates the draft without establishing a timing or speed claim.
