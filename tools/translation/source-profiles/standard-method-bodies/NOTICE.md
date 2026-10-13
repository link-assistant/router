This profile reuses complete original Rust 1.89 core option, result, str and Default
source archives already retained in this repository. Each source is validated
against compressed and original SHA256, byte counts and original Git blob
identity. MIT OR Apache-2.0 licenses are retained in ../copy-standard/.

The generic source selector extracts each named function from its actual impl
owner. Primitive Default bodies come from the original default_impl! rule and
the actual matching invocation through the existing token-tree expander.
No default values or Option branch bodies are written as target templates.
The ordinary Rust parser parses the actual selected block completely.

The bounded specialization requires an actual canonical Option with a checked
scalar or borrowed str payload, checks each original body through the shared
frontend and preserves source parameter evaluation order. Result unwrap_or
retains its existing bounded contract without source-body promotion. All
source-body checks and JavaScript/strict TypeScript target execution are
verified by paired Node and Bun cohorts at implementation commit
`2bf7c3c3d18ae9f96b253119352b4d2a9b3243f5`. The focused 31-file cohort
passes 261 cases in each engine; the unchanged original 31-file regression
cohort passes 262 cases in each engine and includes the complete original CSV
source closure.
[Complete attempt evidence](../../../../docs/case-studies/issue-759/current/source-standard-bodies-2bf7c3c3/README.md)
retains every earlier failed attempt, raw log, source fingerprint and private
diagnostic probe.

Canonical/profile corpus admissions remain unproved by these focused tests.
This profile does not close the core namespace, authorize custom or derived
Default implementations, prove destruction semantics, admit mutable borrowed
locals or translate the complete core library. No Rust build ran.

The shared-view profile parses the original Option::as_ref and Result::as_ref
match bodies and their immutable `ref` binders. Result source reuses the
existing result-iterators archive; no archive or license is duplicated.
Option::is_none_or, is_some_and and map_or_else specialize the original match
and actual FnOnce signatures with independently checked callback bindings.
These additions require private original caller/parser associations and exact
source reconstruction; serialized checksums cannot restore that authority.
Shared references use the original core shared-reference Copy implementation;
this does not prove pointee Copy, destruction or pointer equality. Mutable
captures and mutable references remain refused.
