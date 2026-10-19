### Fixed

- Preserve unsupported original Default field type parses as generated-method refusals instead of aborting an otherwise useful whole-source translation. Genuine parser errors retain their original reason and field span; unrelated exceptions still propagate.

### Validation

- All 15 complete container Default fixtures pass in Node and Bun, including unsupported BTreeMap/BTreeSet/Mutex/Arc fields alongside executable original functions and supported Default bodies.
- Whole original subscription usage, recovery and cookie behavior fixtures run again under both engines. The related 14-case cohort retains one stale deployment certificate-count assertion for the bulk fixture repair; its earlier parser abort is resolved.
