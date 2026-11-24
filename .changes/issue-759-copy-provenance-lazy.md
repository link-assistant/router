Avoid scanning complete original Rust source for unused lexical macro evidence
when Copy certification already has complete resolved attribute bindings. The
fallback retains original shadow and unknown-import refusals and consumes each
of its lexical results once. No semantic context or proof is shared between
compilation profiles. All 246 tests across the complete thirty-file affected
scope pass under both Node and Bun, including absent-scope macro and import
refusals and the distinct resolved bang/attribute namespaces. Canonical producer
performance is unmeasured. This does not establish full translation or native
parity.
