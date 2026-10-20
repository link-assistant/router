# Source-backed formatting adoption draft

`proposeSourceBackedCoreFormattingCorpus` in
`tools/translation/source-backed-core-formatting.mjs` is an additive source
proposal API. It accepts the existing complete `files`, actual `entry` and
`compilationProfile`, plus optional actual `dependencyInputs: {manifest, lock}`.
The original formatter and corpus APIs retain their complete original bodies.

The new lane creates a fresh original module graph and private enclosing
producer context. Binding inspection blanks only exact original derive
attributes whose complete generated output has no enclosing type or usable
value bindings. Helpers also require the exact original derive input and its
actual registered helper source. Container, field and variant positions remain
associated with their original source spans. Unknown attributes, helpers,
macro producers, import globs, format shadows and unresolved configuration retain
their refusals. Missing or different Cargo inputs cannot grant producer closure.

Inspection also blanks exact original items whose actual configuration is
inactive under the selected profile. Their original conditions, module/view
associations, spans and complete source remain in `inactiveItems`. Unknown
conditions stay visible. The private formatter skips inactive function spans;
original disabled items and attributes remain unchanged in emitted source.

These temporary inspection strings retain UTF-16 coordinates and line endings.
Every inspection has complete original/inspected CST, serialization/reparsing,
separate language and repository sequences and a whole-source inverse. Emitted
formatting proposals retain all original attributes and source bytes outside
the existing explicit formatting/type edits. Inputs, scope sources, graph
diagnostics, producer effects, inspection data, mappings and inverses remain
available for independent review. No source is installed by this API.

`node tools/translation/prepare-source-backed-formatting.mjs --write` generates
the new producer from complete original function declarations selected with the
installed TypeScript 5.9.3 native AST spans. `--emit` returns its complete source
proposal; `--check` rejects stale generated source. Its language and repository
CST sequences preserve complete input/output source and inverse. Generated
source is never maintained by hand.

The new complete receiving test file is
`tools/translation/test/source-backed-core-formatting.test.mjs`. Its source
controls cover old APIs, original producer/helper association, Unicode spans,
refusals, full inverses and separately strict compiled TypeScript execution.
Tests, complete actual corpus production, executable coverage measurement and
the full JavaScript gate remain unrun in this worker draft. A proposal selection
does not establish a newly executable function. Original full source must be
regenerated and independently checked before reporting application gains.
Rust tools remain unrun locally under issue #759.
