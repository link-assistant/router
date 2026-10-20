# Owned vector construction candidate

`crate::translation_core::vec!` is an explicit compatibility interface backed
by Rust's `::std::vec!`. Library allocation internals remain native. The new
checked lane supports comma lists of at most 4096 primitive integer, Boolean,
standard owned-text or borrowed-`str` elements. It uses the existing vector
expression parser, array checker, source ownership/lifetime checks, semantic
serialization/reparsing and JavaScript/TypeScript emitter. Element expressions
retain their source order and execute once.

Repetition, nested collections, nominal records, mutable/shared-reference
elements, erased generic identities and unproved borrowing remain refused.
The existing ordinary `vec!`/`std::vec!` owner gates remain independent. A
qualified owned call requires the complete genuine facade, original source
scope and stock parser method. An imported alias or public metadata cannot
establish that association. Const allocation remains refused. Successful
resource behavior excludes allocator/OOM effects, matching the existing owned
text and immutable collection projection.

`prepare-core-vector-sources.mjs` uses TypeScript 5.9.3's native AST to select
the complete source-data literals and actual Host parser/checker methods. Its
Rust CST rule derives the vector wrapper from the existing owned-format wrapper
by changing the macro's name and absolute standard delegate. Ordered language
and repository rules retain complete before/after CST, serialization/reparsing,
all edits and whole inverses. The generated Host hook delegates to the existing
checker and keeps its enclosing ownership and primitive-identity checks.
The native source producer also copies the existing fixed-array element-origin
equations into a separate owned-list branch. The original portable checker
normalizes expression objects through `reuseSuccessors`; that pass copies
element arrays while retaining checked types. The vector checker and its
private association now live in the lifetime module. Its real program lifecycle
joins each normalized vector to the complete unchanged typed tree issued by the
same checker and a genuine original parsed declaration. It then records the
exact normalized node, type, element-array and element identities privately.
No rebinding operation is exported. The association maps and original typed
fingerprints live only inside a synchronous same-checker program frame, created
before the original `super.program` call. A `finally` block clears that frame
and restores its enclosing frame on success or exception; nested invocations
have independent storage. No production proof/hash state survives the call.
The public synthetic helper contract remains separate and grants no original
source association. Copied programs or contexts, foreign checkers and changed
original/normalized trees cannot establish this join.
Each borrowed element keeps its actual input or static origin, including when
the enclosing vector owns its allocation.

Run the read-only producer comparison with the repository's installed compiler:

```sh
node tools/translation/prepare-core-vector-sources.mjs --root /absolute/checkout --check
```

The complete historical source inputs are checked-in fixture DATA. Check mode
freshly regenerates all six outputs and compares every byte: the Rust facade,
its complete SOURCE/SHA256 literals, Host integration, vector parser/forwarding
module, lifetime-origin adapter and independent Rust oracle. It does not
consume saved compiler programs or verdicts. The source
proposal and source-data constants grant no semantic authority. The oracle
source has not run locally; all Rust tools remain prohibited during issue #759.

`migrateCoreVectors` produces an explicit source proposal for unqualified
`vec!` uses in complete top-level functions. It reuses the formatting adopter's
conservative complete-module/parent macro binding capture. Competing macros,
glob imports, unknown attributes, unresolved parent macro imports and local or
other macro producers retain refusals or unchanged functions. It preserves
complete original and edited source, serialized CST, edits, mappings and a
full inverse. Comments and whitespace between the macro name and bang survive
adoption. Qualified standard calls are kept unchanged. The proposal does
not select an original standard macro implementation or admit its caller;
the owned candidate must pass a fresh checker independently.

The complete physical production frontier DATA report retained on 2026-10-21
has 31 historical `vec!` first-refusal functions. Its opaque-aware token report
finds 99 `vec!` occurrences across 63 carried functions. Those sets overlap and
are not executable gains. The first receiving application case retains the
complete original `proxy/upstream_headers.rs` parent/module and its exact
`forwarded_client_headers` body, proposes the owned call, and independently
checks that complete function in an explicit receiving carrier. This is not
whole-application or whole-crate admission; unrelated parent functions and
production namespace/configuration obligations remain separate.

The complete new receiving file is
`tools/translation/test/router-core-vectors.test.mjs`. It covers producer
inverses, primitive/text results, checked call order, semantic/owner refusals,
adoption ambiguity and the original application module. It executes emitted
JavaScript and strict-compiled TypeScript. Whole production regeneration,
original-context coverage measurement, the complete JavaScript gate and gated
Rust CI remain coordinator obligations. The historical 155/2567 executable
measurement is unchanged by this source candidate.

The first combined receiving run exposed five failures in these seven cases:
macro token selection, separated bang handling, an incorrect ordinary-vector
baseline assertion and missing borrowed-element origin traversal. Their
complete diagnostic streams remain retained. The repaired complete seven-case
file passed JavaScript and strict TypeScript in 17.47 seconds with 727,465,984
bytes peak aggregate RSS and an independent seven-case deadline join; each
original case limit remained 60 seconds. Native source regeneration and all
five vector/dependent-formatting source comparisons passed separately. A
subsequent tighter private element-array/type association kept five cases green
but refused the two borrowed-list positives because it rejected the original
checker's normalization copies. The complete seven-case diagnostic retained
both refusals and the exact association mismatch: element type identity agreed,
while normalized array and expression identities differed. The lifecycle join
repair passed native source generation with six complete source equations and
all dependent formatting equations. The complete seven-case receiving file,
including copied-program/foreign-checker controls and unchanged 60-second case
limits, passed JavaScript and strict TypeScript in 17.63 seconds with
722,272,256 bytes peak aggregate RSS. The complete native-AST case/deadline
audit, Node event stream and source vectors are retained. These results do not
change the historical production coverage measurement.

CST inverses prove exact source restoration; they do not establish executable
reverse translation. The owned-core reverse bridge currently registers JSON
operations in `js-to-rust/owned-core-operations.mjs` and reconstructs a closed
expression domain in `js-to-rust/owned-core-source.mjs`. It has no generic vector
literal or owned-vector operation: its expression dispatcher reaches
`unimplemented expression ArrayLiteralExpression` for a plain emitted list,
and its registered-operation gate refuses unregistered vector helper calls.
No reverse receiving roundtrip or bidirectional coverage is claimed here.

The later frame-lifetime repair adds closed-frame, exception and nested-program
storage controls. Actual native source generation and all dependent equations
passed in 18.63 seconds with 667,811,840 bytes peak aggregate RSS. The complete
seven-case receiving file then passed in 17.58 seconds with 735,330,304 bytes
peak aggregate RSS, including both borrowed-vector positives, strict TypeScript
and the independent seven-case deadline join. All original 60-second case
limits remained intact; full source vectors and event streams are retained.
Broader integrated and production qualification remains separate.
