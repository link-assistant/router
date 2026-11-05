# Local declarative source expansion draft

`proposeLocalDeclarativeSource` selects plain original root `macro_rules!`
definitions and their subsequent unqualified root invocations. It copies the
complete original matcher/transcriber engine with ordered language and repository
substitutions. The old engine and project entrypoints retain their contracts.
All implementation and regression source is unrun during bulk drafting.

The copied engine alone owns its actual definitions, inputs and expansions.
Literal fragments use the current pinned original grammar. Recursive calls use
actual private nested-input forwarding and outer-before-inner discovery; an
argument discarded by the outer rule is never expanded. The source adapter
retains all original definitions, ordinary function bodies and inline modules.
Unknown producers invalidate preceding textual candidates; a subsequent direct
definition can establish a new candidate. No attribute spelling is treated as
an inert owner proof. Whole-crate attributes refuse preprocessing.

Plain rendering cannot recover Rust macro hygiene. Every actual selected rule
therefore requires disjoint identifier spellings between its input and literal
template nodes. No keyword/type whitelist weakens that conservative refusal.
Generated definitions, attributes, raw identifiers, dollar-crate ownership and
unknown/qualified surviving nested macros require separate rules. They keep the
entire original invocation unchanged. These refusals preserve semantic questions
instead of granting ownership from a source digest or a lexical name.

The source pipeline serializes/reparses complete original and substituted CST
and retains full inverses, all refused source and actual expansion receipts.
The project entry separately sends reconstructed expanded source through the
original Rust frontend, checked semantic-meta round trip and JS/TS emitter.
Its original-source mappings stay separate from the compiler's expanded-source
domain. Successful source expansion does not qualify original-source semantic
equivalence, namespace completeness, application coverage or native parity.

Existing macro limits remain intact. Additional bounds cover 64 rendering calls,
65,536 visited cells and 2 MiB accumulated rendered bytes per root; one file has
128 attempted root expansions, 200,000 rendered cells and 8 MiB rendered bytes.
The project retains the 4,096-source universe, 8 MiB file and 128 MiB original
source limits, with a 192 MiB complete original/expanded raw-source budget.
Engines and grammar proofs are invocation-local and allocated only when needed.

Independent unrun cases cover ident/type/literal captures, discarded unknown
arguments, actual recursive forwarding, source order, opaque producers, hygiene,
attributes, original scope retention, whole inverses, fresh readers and both
emitted targets. Rust oracle source is for gated CI only. Local/inline-scope
expansion, complete architecture exports/type prefixes, same-scope producer
bootstrap, broader owned/async domains, production adoption and all remaining
requirements still need source implementation.
