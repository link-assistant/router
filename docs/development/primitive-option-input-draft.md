# Closed primitive Option input draft

Public `Option<bool>`, `Option<u64>`, `Option<i64>` and `Option<&str>` now have
source drafts for the existing owned profile. Their input domains come from
actual bound runtime declarations and freshly checked native type queries. The
entire current Option native module, root edge and runtime/declaration sources
are additionally required. Borrowed inputs retain their original input root;
the existing Some guard, source lifetime and escape checks still apply.

These are the finite typed ABI values of the compatibility interface. Arbitrary
JSON references, unknown optional layouts, loose object annotations and invalid
foreign payloads do not acquire admission. Qualifying shared source is done once
within each fresh function analysis; no context-wide or cross-invocation verdict
cache is introduced. Runtime operations continue validating their actual operands.

The canonical Rust inverse reconstructs these parameter annotations through real
imports, then rechecks the whole emitted source and reproduces the complete Rust
syntax. Complete original checker/inverse/preparer sources and both ordered CST
histories remain retained. Independent public caller, borrow/fallback, typed
consumer, body/absence, full native inverse and missing-source cases are drafted
and unrun. General nested/owned/recursive optional inputs, callbacks, Result
families, automatic adoption and full production synchronization remain open.
