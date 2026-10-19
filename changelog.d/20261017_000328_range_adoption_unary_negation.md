---
kind: fixed
---

Recognize an actual macro name before retaining a range inside an unexpanded
macro token tree. Standalone unary negation, including double negation and
negation after control keywords, no longer masks ordinary inclusive-range
adoption. Real merged or separately punctuated macro names and contiguous raw
identifiers still preserve their complete token trees.

Extend the existing whole range tests with negated, double-negated and
keyword-adjacent source, nested unknown macros and raw macro names. Keep the
complete original three-validator proposal assertions and fresh cold CLI
comparison. Existing binding, f64 ownership, source/inverse checks and deadlines
are unchanged. All JavaScript/TypeScript receiving checks are UNRUN for this
source repair; Rust remains CI-only. Source adoption is not executable coverage.
