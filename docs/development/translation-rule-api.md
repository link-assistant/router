# Translation rule API and verification boundaries

The [rule-layer contract](translation-rules.md) defines the required separation
between language semantics and repository conventions. The implementation in
[`rule-pipeline.mjs`](../../tools/translation/rule-pipeline.mjs) accepts exactly
two phase declarations, in this order: `language`, then `repository`. Either
rule list may be empty. Extend those lists or compose pipelines for additional
logical layers; arbitrary phase names are not accepted.

```javascript
const pipeline = createRulePipeline([
  {phase: 'language', rules: [{id: 'language:checked-transform', apply: lower}]},
  {phase: 'repository', rules: [{id: 'repository:package-output', apply: packageOutput}]},
]);
const {value, trace} = pipeline.run(input, context);
```

Each `apply(value, context)` receives the preceding rule's result and the same
context object. Rules run synchronously, in declaration order. Declarations must
use ordinary own data fields and dense arrays. IDs must be unique, nonempty
strings of at most 160 characters; choose semantic IDs that survive unrelated
insertions. The pipeline snapshots the declarations and returns frozen phase
descriptions and per-run traces. It does not clone, freeze or authenticate the
input, context or intermediate semantic objects. There is no runtime plugin
registration hook in the current translator entry points.

Declared async functions, returned Promises, proxy results and own thenables
are refused. An own `then` accessor is refused without invocation. Inherited
`then` fields are neither read nor assimilated. A thrown error propagates
unchanged and later rules do not run. Nested runs keep independent local state.

`exactSubstitutionRule` requires one occurrence of its nonempty text anchor and
retains JavaScript string-replacement behavior. Its caller must independently
pin the upstream input and retain the original source and license. Neither a
successful anchor match nor a rule trace proves source ownership, a type,
borrowing, effects or executable admission.

## Migrated paths and candidate evidence

The 148 candidate uses the two sequences in the following actual paths:

| Path | Language sequence | Repository sequence |
| --- | --- | --- |
| Core compiler bootstrap | Exact upstream substitutions | Dependency import rewriting |
| Standalone Rust emission | Emit an already checked program | Attach export signatures from that same program |
| Strict JavaScript translation | Analyze, serialized/reparsed checked meta, emit Rust and TypeScript | Package the resulting artifacts |
| Native TypeScript emission | Apply the existing TypeScript transform | Print and inspect the typed result, retaining existing disposal |

Parsing and checking outside these hooks retain their existing validation. The
151 candidate adds the tracked-project path: its language rule runs the existing
graph, parser, checker, meta round trip and target emission. A private closure
then packages exports, annotations, provenance, serialized programs and lazy
declaration facades in the repository rule. Both rules retain the same checked
program and original private issuers. The repository finalizer grants no new
semantic admission. Individual parser and checker extensions are not thereby
made independently configurable.

These candidates are not a complete verified pipeline or parity claim. The 148
worker's final group passed 87 tests under Node and 86 of 87 under Bun; the
unchanged reverse-regeneration case exceeded its original five-second bound.
Coherent receiving tests remain required. The 150 coverage and 151 project
drafts have not run local Node/Bun verification. The desired constructor alias
regression in 150 also requires the separate boundary repair and regenerated
outputs.

The 151 paired prehook comparison covers complete **method-free** project
inputs, including functions, constants, data, refusals, source scopes, callback
order and lazy declaration outputs. Genuine method issuance, copied evidence
and cross-analysis rejection are separately checked through the actual module's
own private issuer APIs. Baseline method facades are not passed through another
module's issuer. This is not complete cross-module method equivalence evidence.

Run complete focused JavaScript files and strict TypeScript checks for fast
feedback, then the complete integrated JavaScript gate and freshness checks.
Keep failed runs, source identities, compiler versions and original deadlines.
During issue #759, author Rust regression source where useful but run no local
Rust tests, builds or Rust-backed tools; Rust execution belongs to CI after the
same-head JavaScript gate passes.
