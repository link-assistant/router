# Explicit primitive vector reverse candidate

The current owned-core reverse checker has no general array literal expression
or vector result domain. It accepts arrays only inside registered JSON
constructors, requires an actual owned-core host call in each checked function,
and uses `readonly bigint[]` solely for the existing base64 octet borrow lane.
The existing Rust forward vector profile already accepts qualified owned lists
of primitive integers, bool, owned text and borrowed str. That forward result
does not by itself qualify a reverse array implementation.

This new candidate initially handles complete zero-parameter functions whose
single statement returns a dense bool/integer literal array. Empty lists use
the original contextual element domain. Integer widths, signedness and bounds
come from the genuine original Rust signature. Owned/borrowed text, parameters,
local aliases, mutation, repetition, spreads, nested vectors, fixed arrays and
unknown original ownership remain explicit refusals. It establishes no whole
project coverage, executable gain, Rust execution or runtime parity yet.

## Fresh original source/type join

The candidate context retains original source DATA using the existing source
context contract plus exact source selectors in `vectorBindings`. Selectors
contain only the JavaScript path/name and original Rust path/qualified name;
no type, flag, saved program or verdict is accepted.

Each native reverse module traversal calls the actual complete `translateProject`
internally over all captured original Rust sources. It selects exactly one
fresh executable declaration and invokes that declaration's actual `lower()`
closure. The current project implementation closes that callable over its same
checked target program and returns `{own,program,emitted}`. The candidate never
reads `meta.checkedSemanticProgram` and never accepts a callable from its caller.

The fresh function must have zero parameters, an owned Vec return, a closed
bool/fixed primitive element with the actual original name/width/signedness,
and an accepted qualified owned-vector list body. Its full physical Rust parent,
source hash, exact native module/function view and source span remain retained.
The module view comes from that same fresh result's source-scope row, joined by
the physical source, complete qualified module path and fresh source hash.
This preserves external-file prefixes and nested inline modules; a new local
file-view capture would lose the external module prefix. A same-named function
in a different module cannot supply the selected original signature.
The same actual JS/TS pair undergoes existing whole CST transport, native type
erasure, whole executable-token/AST equality and lexical symbol checking. A new
JavaScript list may differ from the original forward body, but every edited
literal must fit the original actual element profile.

Actual forward programs, type objects and callable carriers stay local to this
invocation. The forward result is released in `finally`; failed capture also
clears its partial profile map. The reverse traversal's
profile map is cleared in `finally` before any analysis returns. Only detached
source/scalar/signature DATA enters checked metadata. Every later serialization,
read and emission uses the original private reissuance checks and creates a new
forward invocation. The existing item-check scope may reuse that invocation's
whole source analysis only within its original synchronous lifetime. There is
no source/owner/verdict cache across candidate API calls.

## Source-copy boundary and receiving obligations

`js-to-rust/prepare-owned-vector-candidate.mjs` reads the complete actual
`owned-core-source.mjs`, `owned-core-operations.mjs` and
`owned-core-document.mjs`. Installed TypeScript 5.9.3 selects their actual
function/import spans. Separate language and repository CST rules add the
candidate dispatch and relocate only the copied private import closure.
Complete source is serialized, reparsed, reconstructed and inverted. Native
copied-binding checks and final fresh original/support reads remain mandatory.
The candidate document has its own profile string.

Only these new outputs are authored by the producer:

- `owned-vector-candidate-source.mjs`
- `owned-vector-candidate-operations.mjs`
- `owned-vector-candidate-document.mjs`

The original owned-core source/checker/emitter/document and base64 domains are
unchanged. The new receiving API is `owned-vector-candidate.mjs`. It retains the
whole CST, checked source-document serialization/reparse, Rust and TypeScript
emission, independent evaluator and original source checks. Generated modules
must come from the actual producer, never hand editing.

Root must first obtain the shared resource lease and run the actual producer
with that source root's actual installed compiler, then qualify both complete
new test files under Node and Bun. The original six 60,000 ms declarations
remain untouched; one additional 60,000 ms module-identity control checks an
external file's nested inline module, a competing same-named root function,
full meta reissuance and fresh evaluator lists:

```sh
node tools/translation/js-to-rust/prepare-owned-vector-candidate.mjs --write
node tools/translation/js-to-rust/prepare-owned-vector-candidate.mjs --check
```

The receiving file includes independent source/CST inverse controls, edited
bool/u8/i8 list values, original/strict-TypeScript/reverse/evaluator comparisons,
integer overflow, fixed-array ownership, mutation/alias/spread/repetition/text
refusals, source corruption, forged metadata and unissued clone controls.
Native Rust remains unrun until the complete same-head JavaScript gate passes
and gated CI executes it.

This batch is source-only. The producer has not run, its three new generated
outputs are not yet materialized, and the receiving tests are unrun. Importing
the candidate API before actual generation will refuse at module resolution;
there is no fallback to the old checker or a saved verdict. No defaults are
installed and no measured bidirectional coverage increment is claimed.
