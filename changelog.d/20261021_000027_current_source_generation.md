### Changed

- Materialize the three explicit reverse-vector candidate modules and the
  original checked-source accessor through their native/CST producers, retaining
  complete source plans and inverses. Existing lowering and default reverse APIs
  remain unchanged.
- Refresh the complete historical/current source archive and current Host input
  metadata through their actual source producers. Keep all historical originals.
- Produce identical Unicode Rust oracle text under Node and Bun by using an
  ordinary template for a tail without escape sequences.

### Validation

- All seven reverse-vector receiving cases pass under Node; all 23 shared bulk,
  reverse-vector, checked-source and lifetime cases pass under Bun. Both execute
  independent strict TypeScript targets. Node's original deadlines passed.
- The affected 73-case Node cohort passed. Full-project performance, native class
  export refresh, generated parity and the full JavaScript gate remain open.
  No Rust tools ran locally and no production coverage gain is claimed.
