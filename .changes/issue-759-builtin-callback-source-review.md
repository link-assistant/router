Source-only integration review of the entire45 authored callback/field cases
through3a4aeeb17; all45 remain UNRUN and excluded from frozen Gatef962. No next
phase, namespace consumer or authority activation added. No engines, parser/
helper/probes, test runs, TS/producer or Rust execution.

Concrete fixes from reading the composition and pinned originals:
- Three field-construction assertions now inspect the actual local initializer
  snapshots for Field/empty fallback/mk_pattern_ident. The statement tree holds
  lexical slot IDs, so searching only that tree omitted those genuine values.
- Actual iterator-call argument closures now activate fresh source parameters;
  Clone's map field is distinct from the typed subcall closure field. Local
  functions keep their existing fresh, noncapturing environments.
- Callback invocation identity is retained as an immutable snapshot, so later
  mutation of the caller's path cannot change the source binding. Existing
  private-identity case now asserts this without adding/deleting test cases.
- Source/builder/metadata budget failures propagate through callback inventory
  and bridge catches instead of being mislabeled ordinary residual recipes.
  Node/depth/function/byte caps are unchanged.

Static named-import/export and path inspection covered all eight pending helper
modules and six test files; no missing local imports/exports were found. Raw
manifest/archive lengths and complete SHA256 identities were rechecked with
source reads/decompression only: no duplicate source keys or mismatches. This is
not JS syntax or runtime verification. All implementation modules remain below
1000lines (largest source-substitution module330lines before this repair).
Bulk fingerprints include every new module/local archive; reused declarative
parser/mod archive is already pinned by the existing declarative directory list.

Shared source interfaces builtin-derive-ast-meta, builtin-derive-bang-footprints,
derive-footprints, original-csv-context, macro-token-trees and rust-structure
are unchanged between the reviewed868 baseline and Gatef962. No peer changes
were replayed. Complete original provider/catalog SHA/declaration pins are still
unchanged. Their tests request source/module namespace graphs, never semantic
originalCsvContext.result. Constructor/member Type/Option/Span/Ident/attributes,
recovery/hygiene and Fn/StdVec/Clone/Drop/pointer/feature ownership remain explicit
requirements; positive schema recipes never substitute generated trait behavior.
Metadata size and actual AST traversal outcomes remain unmeasured until the
coherent engine window; limits are neither expanded nor bypassed for fixtures.

The exact45 pending cases remain in these six files:
builtin-ast-builder-meta.test.mjs8,
builtin-ast-container-inputs.test.mjs5,
builtin-ast-callback-bridge.test.mjs8,
builtin-ast-field-construction.test.mjs8,
builtin-ast-closure-application.test.mjs8,
builtin-parsed-field-values.test.mjs8.
