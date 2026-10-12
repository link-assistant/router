This profile reuses complete original Rust 1.89 core option, str and Default
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
source-body checks and target execution remain UNRUN, and original corpus
admissions remain unproved. This draft does not close the
core namespace, authorize custom or derived Default implementations, prove
destruction semantics or translate the complete core library.
