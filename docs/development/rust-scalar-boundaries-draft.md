# Rust normalization boundary source draft

The actual `subscription_usage_normalize` helpers now have five independent
Rust test sources for missing/foreign JSON domains, exact binary64 bits, signed
zero and subnormal numbers, adjacent percentage limits, numeric-string length
and spelling, UTF8 byte boundaries and control/at-sign rejection. These tests
call the existing production helpers. No helper body or production behavior is
changed by the appended `#[cfg(test)]` module.

The collected full-root f64 regression also had an obsolete whole-module hash.
It now checks the entire module against the fresh complete original input
receipt already captured by that test. It retains the historical module pin as
comparison data, the independent unchanged `safe_number` function pin, actual
root graph and locked macro/dependency/profile checks. The original workload,
deadline and behavioral assertions remain required.

`prepare-rust-scalar-boundaries.mjs` retains both complete originals and source
recipes. Language rules add the independent test body; repository rules place
it in the inactive production test scope. The JS regression change uses native
selection of its original test owner. Both languages keep complete serialized
CST equations and inverses. All four production helper slices remain exact.
Rust source structure/CST checks grant no native Rust grammar or runtime proof.

This entire family is unrun. Rust compilation and tests remain authorized only
in CI after every required JavaScript stage passes for that SHA. Source-bank,
inventory, canonical/profile/owned/reverse freshness regeneration is deferred
until the entire bulk implementation draft exists. This is one source draft
for a collected CI failure; it does not establish that the CI failure is fixed.
