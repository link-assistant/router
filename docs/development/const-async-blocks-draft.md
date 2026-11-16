# Qualified const and async block source draft

All new implementation and independent cases are UNRUN. Source review found a
missing positive grammar distinction between a local const item and a const
block expression. The parser now routes const followed by a brace to the
expression grammar, and parses const/async/async move blocks with their complete
original braces, attributes, children, spans and opaque macro roles.

The existing ordinary local function dispatch still handles const/async function
declarations before local items. Array lengths and expression tails can retain
const blocks. Qualified blocks use distinct positive source nodes and the
existing recursive block model, preserving local Item/MacCall obligations and
parent restoration. Unsupported qualifiers and malformed braces remain refused.
This source parser does not evaluate const code, poll a future, qualify original
native AST/visitor ownership or close global exports.

Two complete compiler equations retain original whole modules/class/function
owners, separately ordered language/repository substitutions and CST/meta
inverses. Independent unrun source cases distinguish all three forms and nested
scope obligations. Native CI-only oracle source checks const item/expression
values and deferred async move effects; it supplies no target-runtime evidence.
No parser, translator, model, preparer, tests, experiments, generation, Rust tool
or CI-triggering push ran. All actual lowering, native namespace qualification,
production/reverse/synchronization, freshness, parity and CI obligations remain
open with the complete bulk requirement ledger.
