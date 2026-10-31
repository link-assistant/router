# Primitive vector and iterator caller bulk transaction — source draft

`tools/translation/primitive-vector-iterator-bulk-20261101.mjs` adds
`proposePrimitiveVectorIteratorBulk(data, {family, modules})`. `family` is the
existing `outcome` or `cancellation` profile. A module has `sourcePath`, a fresh
`rustPath`, and the existing exact `vectors` selections
`{function, local, domain}`. Caller sources and every original native,
runtime/declaration and manifest dependency remain in `data.files`.

This is a complete additive automation transaction over existing checked APIs,
not a registration hook. It changes no shared compiler/preparer file. To use it,
import that function and pass complete receiving data to it. Nothing installs
its result. No root integration or changes to the preparer chain are necessary
for this standalone API; export/receiving/CI discovery wiring remains separate
work requiring the coordinator's review.

The language sequence runs the actual literal-vector proposer for each complete
caller module, retaining nested source edits and the existing two CST phases.
It rechecks every complete migrated module through the actual private source
context, serialized/reparsed semantic meta, ownership flow and Rust/TypeScript
emitter. Existing scalar `for..of`, counted `for`, `while`, branches, break and
continue rules remain responsible for every loop backedge and moved slot.
Independent emitted TypeScript is reissued and must reproduce the complete Rust
syntax. The actual canonical Rust inverse then produces JavaScript, which passes
the concrete-meta entrypoint and must reproduce that complete Rust again.

The repository sequence retains each original source, exact migration inverse,
all three source equations and all three canonical artifacts, including complete
serialized/reparsed CST for each. Canonical Rust equality is syntax equality;
exact original comments/trivia are restored by the separate original-source
inverse. Artifacts are proposals, never executable receipts or permission to
overwrite authored source. Existing paired JS/TS files, overlapping module
destinations and already authored Rust destinations are refused. In particular,
the canonical JavaScript artifact is distinct from the proposed edited source;
it must not silently replace an authored application file.

Requests allow at most 16 independent modules and 256 explicit vector selections
per module. Existing complete-source, native syntax/meta, ownership and input
budgets remain mandatory, including 64 literal elements and 4,096 vector values.
The artifact accounting additionally caps complete retained original/edited
source and emitted artifact source/CST at 16 MiB. Source-equation and underlying
semantic structures keep their own original bounds. All contexts are fresh and
closed, including when a later module fails. The first failure stays primary;
every retained context's closing check is attempted. State is invocation-local
and no source, owner, result, failure or verdict cache survives the call.

The independently authored unrun cases cover complete copied/filter/early-stop
collection callers in both families and both source languages, two-module
ordering, original inverses, canonical reproduction, late failure, accessors,
paired edits, forged operand types, unsigned limits and full 4,096-value input.
They invoke the existing interpreters when later authorized; no compiler,
interpreter, parser, translator, preparer or case was executed while drafting.

Known gaps remain explicit. This composes existing primitive collection and
scalar-loop behavior; it adds no new lazy map/filter/fold adapter, stored iterator,
closure capture, borrowed aggregate or escaping-reference semantics. Forward
generic Rust iterator APIs remain unchanged, and arbitrary authored Rust iterator
chains are not admitted by this canonical inverse. Literal/push/length adoption
changes the ordinary-array input/resource contract and length representation;
original-body equivalence remains false. Native oracle scheduling, strict
compiler execution, production caller census/adoption, complete receiving export,
platform packaging, atomic filesystem installation/conflict recovery and full
Router parity are not supplied by this API. No checklist row is closed by these
unrun source additions alone.

Execution: **UNRUN**. CI/review feedback: **not inspected**.
