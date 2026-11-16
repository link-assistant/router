# Independent token-row edge case source

All new cases are **UNRUN**. No local test, compiler, translator or parser was
executed. These sources exercise the complete actual `token_report::row`
contract; they do not qualify its still-incomplete translation.

`rust/tests/token_report_translation_edges_20261101_test.rs` contains four
independent original-owner tests covering nine inputs: empty/nonobject/wrong
kind defaults, missing versus zero versus floating maximums, whitespace scope,
exact unsigned values above2^53 and u64::MAX, Unicode width, oversized fields,
and literal braces/newlines/spaces in labels. Expected columns use a separate
padding implementation and literal expected scalar fields, not translator
operation tables or the application's formatter. This normal Cargo integration
target also matches the existing Windows `*_test.rs` sweep. It needs no new
workflow command or source-overlay profile, and remains gated by all eight
same-SHA JavaScript stages. No native execution success is claimed.

`tools/translation/test/token-report-translation-edges-20261101-cases.mjs`
provides independent matching expected cases for a future actual translated
whole-module row export. Inputs use the real lossless tagged JSON parser,
preserving integer and float distinctions; expectations use Unicode scalar
counts. A handwritten row callback is not receiving or parity evidence. The
helper is not yet attached to a qualified whole-row receiving path: local
closure and two-arm Option adoption, other actual-row residuals and full
JS/strict-TS checking remain separate prerequisites. Scheduling this helper
must not silently skip unsupported rows or count its source as a passing case.

Native-only behavior and the deferred paired expectation source close no
acceptance bundle or function-coverage gap. Full actual module/dependency
source, genuine checker receipts, original target reproduction and both
directions of semantic edited synchronization remain required.
