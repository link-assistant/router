# Extensible translation rule layers

Router's translation contract has two required ordered sequences. The language
sequence handles source syntax, name and type resolution, checked semantic
substitutions, serialization/reparsing of meta, and target-language semantics.
The repository sequence handles Router's output paths, import conventions,
formatting, provenance and quality validation. Declare both sequences explicitly,
including an empty repository sequence when a reusable language component needs
no repository adaptation. Additional layers may refine these responsibilities;
their order and prerequisites must remain explicit.

These are requirements for both Rust → meta → JavaScript/TypeScript and
JavaScript → meta → Rust/TypeScript. The current translators contain many
specialized parser, checker and emitter extensions. They remain incomplete;
adding a pipeline declaration alone does not implement missing source semantics
or prove whole-source synchronization.

## Concrete syntax before checked semantics

The meta-language has a distinct `meta-language-concrete-syntax-v1` document
with `representationLevel: 'concrete-syntax'`. It retains one complete source
string and ordered token, trivia and delimiter spans. Serialize and parse that
document, reconstruct the source, then let the semantic parser consume the
reconstructed text. The ordinary source entry requires identical UTF-16 code
units, including comments, BOM, CRLF and restricted-production line terminators.
Source encoding observations distinguish well-formed UTF-8 preservation from
replacement encoding of lone UTF-16 surrogates; they do not invent original
byte recovery for an input that was supplied only as a JavaScript string.

The reverse adapter in
[`concrete-source.mjs`](../../tools/translation/js-to-rust/concrete-source.mjs)
uses fixed language and repository concrete-rule sequences. Its ordinary source
path performs an identity round trip; there is no caller callback or skip flag.
`translateConcreteSyntaxMeta` instead consumes a canonical JavaScript or
TypeScript concrete document, so a prior explicit concrete substitution really
changes the source sent to the existing native parser and semantic checker.
The resulting source receives fresh owner and body associations; a checksum,
rule trace or copied source context cannot replace those joins. Rust and
TypeScript emission still follows the separate serialized, reparsed and checked
semantic program. The strict result retains the complete concrete serialization
alongside its existing semantic meta and target outputs.

Concrete status is `lexical`, `opaque` or `error`. None certifies grammar,
types, names, effects or execution. Preserve the full source and diagnostics in
all three cases; the existing native parser and semantic checker independently
decide admission. A valid legacy native source can therefore continue even when
the concrete provider retains a whole opaque region. Malformed JavaScript must
still fail the real native syntax check. The native TypeScript AST route also
consumes identical reconstructed JavaScript before its unchanged source-file
identity, syntax and automatic-semicolon-insertion checks.

The reverse semantic entry now requires the installed TypeScript compiler even
for pure portable scalar input. Each call creates a fresh native source file;
the existing ownership syntax cache does not supply this grammar decision.
Compiler loading failures propagate as environment failures, not source
diagnostics. An exported bundle must select its genuine receiving dependency
root before fresh import. This is an explicit dependency of the new stage,
not an inference that a copied compiler bundle includes installed dependencies.

The reverse executable subset remains incomplete. JavaScript-compatible
TypeScript concrete input can reach the existing checked Rust/TypeScript
emitter, while unsupported annotations, enums and other typed constructs refuse;
there is no blanket type erasure. Concrete syntax does not repair unresolved
class bootstrap, trait-owner or producer-effect obligations. Source-stage
bounds are 2,097,152 UTF-16 code units, 8,388,608 UTF-8 bytes, 200,000 nodes,
256 delimiter levels and 33,554,432 serialized UTF-16 code units. Whole opaque
regions preserve fidelity when lexical classification is uncertain; inputs
beyond absolute source or serialization safety bounds may refuse. Existing
semantic limits, complete test files, strict compiler versions and deadlines
remain unchanged. This source draft requires receiving checks and qualified
regeneration before any current-tree freshness or parity claim.

For stored or edited documents and explicit corpus batching, use the
[bulk CST transport contracts](concrete-syntax-bulk.md). Their grouped source
authentication schedules and whole-call budgets remain distinct from standalone
calls and project component storage. Batch results grant no semantic permit.

## Rule contracts

Give each rule a stable unique identity and a deterministic position. State its
input and output representation, prerequisites, positive admission conditions,
refusals and source-evidence requirements. A substitution can replace a parsed
construct with checked meta, or checked meta with equivalent target syntax;
translation need not be a text-replacement system. Keep parser and checker
validation around each semantic transformation. Preserve source spans, owners,
evaluation order, integer bounds, borrowing and observable error behavior.

Exact upstream source patches require pinned bytes and a unique matching anchor.
An absent or repeated anchor fails before execution. Keep copied upstream
implementations and licenses inspectable. Place reusable language rules outside
Router-specific adapters so other repositories can copy the implementation
without inheriting Router paths, schema choices or naming exceptions.

At the checked-semantic and target-packaging boundary, repository rules consume
already checked results. They may choose imports, identifiers, layout and
formatting only while preserving those results. They
must not turn an unsupported construct into executable output, suppress a
dependency refusal, supply an unproved implementation or bypass the meta
round trip. Source proofs and private issuer identities retain their existing
validation boundaries across rule layers.

A separately declared source-adoption pipeline may instead transform candidate
CST before semantic checking, including a maintainer-authorized mapping to a
[paired compatibility-core API](compatibility-core.md). Retain both ordered rule
sequences, complete original/edited CST, actual serialization/reparsing and full
inverses. The resulting source must receive fresh independent semantic and
whole-function checks. A source proposal grants no original trait-dispatch
authority, executable admission or whole-parent equivalence.

## Extending and checking a rule

Start with actual Rust or JavaScript source that exposes the missing behavior.
Add independent expected results, edge cases and refusal controls; avoid tests
that only reproduce the implementation's own output. Check the complete emitted
JavaScript and strict-compiled TypeScript for the admitted construct. For a Rust
oracle regression, add the Rust case too, record that it is unrun locally, and
use CI after the complete JavaScript gate passes for that same immutable SHA.
During issue #759 no local Rust tool invocation, including formatter/compiler
diagnostics or hooks, is authorized.

Run complete focused JavaScript files first to collect related defects quickly.
Then integrate the whole repair batch, regenerate all affected outputs and run
the mandatory complete JavaScript gate. Keep forward and reverse freshness,
native parity and behavioral evidence separate. A preserved source file,
successful rule invocation or current generated artifact does not establish
runtime parity. Retain complete failed and passed streams, actual compiler
versions, command deadlines and source identities.

See [the JavaScript-first workflow](javascript-first.md),
[synchronization commands](translation-sync.md) and
[the translator implementation](../../tools/translation/README.md) for current
commands and limitations.
