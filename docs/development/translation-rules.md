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

Repository rules consume already checked results. They may choose imports,
identifiers, layout and formatting only while preserving those results. They
must not turn an unsupported construct into executable output, suppress a
dependency refusal, supply an unproved implementation or bypass the meta
round trip. Source proofs and private issuer identities retain their existing
validation boundaries across rule layers.

## Extending and checking a rule

Start with actual Rust or JavaScript source that exposes the missing behavior.
Add independent expected results, edge cases and refusal controls; avoid tests
that only reproduce the implementation's own output. Check the complete emitted
JavaScript and strict-compiled TypeScript for the admitted construct. For a Rust
oracle regression, add the Rust case too, record that it is unrun locally, and
use CI after the complete JavaScript gate passes for that same immutable SHA.
During issue #759 no local Rust tests or builds are authorized.

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
