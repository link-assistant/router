# Translation rule API and verification boundaries

The explicit `modeled-external-ordinary-library-v1` request in
[`external-library-namespace.mjs`](../../tools/translation/extensions/external-library-namespace.mjs)
models a direct dependency's ordinary library input without injected `cfg(test)`.
It requires a genuine current parser frame, the complete pinned package and
fresh original Cargo/default-feature inputs. It does not prove the actual Cargo
unit, invocation flags, native parity, attribute owners, or trait behavior.
`configureOriginalExternalLibraryDomain` and
`captureOriginalExternalLibraryContext` are additive APIs; the existing
two-argument trait closure and std-only default-context APIs keep their existing
domains. The new trait closure still refuses the unresolved base64 namespace.

`originalNamespaceAttributeInputs` retains complete source-bound literal-doc
inspection candidates with `callerOwnerResolved: false`. Consumers must not
use those candidates as namespace or availability authority. The per-invocation
`proveBuiltinDeriveEmptyEnclosingEffect` lane independently reissues every
actual builtin owner through the existing complete output issuer and joins the
original Impl namespace theorem. It requires an already genuine input context;
it cannot supply the missing original ancestor/tool-owner proof for that input.
In particular, the retained `core::arch::x86_64::*` non-trait import theorem does
not prove absence of a competing `rustfmt` type-prefix binding. A complete
source-backed export/producer closure remains required; registered spelling or
a public namespace flag cannot replace it.

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
source-module resolution, parser, checker, meta round trip and target emission. A private closure
then packages exports, annotations, provenance, serialized programs and lazy
declaration facades in the repository rule. Both rules retain the same checked
program and original private issuers. The repository finalizer grants no new
semantic admission. Individual parser and checker extensions are not thereby
made independently configurable.

The integrated 148 and 151 paths passed the complete six-file receiving group
on `af6bab7d9`: Node 95/95 in 113.359243 seconds and Bun 95/95 in 101.942163
seconds, with no skips or timeouts. All source, 806 original-input and compiler
pins remained unchanged; TypeScript was 5.9.3. Bun's reverse three-build case
took 4694.08 milliseconds under its unchanged 5000-millisecond bound. Complete
logs and vectors are retained in `coherent-rule-pipelines-148-151-v2`. The prior
worker Bun timeout remains retained as a distinct failed run. These receiving
results establish neither current generation freshness, a complete green gate
nor runtime parity. The complete 150 behavior suite ran against the explicitly
pinned historical generation `75508fd418cef2b7dc710700b9305bbe116ffe49`:
seven of eight groups passed in both engines, including strict TypeScript. The
remaining group reproduced mutable aliases in the original generated
`DeploySection`, `Run` and `Area` constructors. The separate boundary repair
passes its complete nine-case focused group in both engines; regenerated
original-project outputs and the complete integrated gate were still required
at that checkpoint.

After full canonical and three-profile regeneration, the complete 15-file
receiving group passed 140/140 cases under both Node and Bun on `a49f625b2`.
It includes all eight original-body groups against current generated artifacts,
the constructor boundary tests and strict TypeScript 5.9.3 execution. All 806
original inputs were physically present and unchanged. Each engine retained
100 complete vectors: 39 files are byte-identical, 58 gzip files have identical
complete decoded bytes, and three frontend vectors differ only in the child
runtime's declared version. Both original compressed streams remain retained.
The earlier constructor failure remains a separate historical result. These
receiving passes do not establish the complete gate or full runtime parity.

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

`staticSourceAssociatedContext` is a separate test-data API for six explicit
associations outside the original sixteen static-source lifecycle cases. It
checks complete historical Rust/Cargo universes and retains current physical/Git
joins and adoption history. Association records grant no namespace, dispatch,
ownership, semantic or executable authority. The original sixteen-case API and
the default current `originalCsvContext` retain their existing behavior.

The associated CSV helper selects one complete historical universe; it never
mixes a pinned old file into a current graph. Its twelve original workloads,
including the 900000 ms case deadlines, remain separate receiving obligations.
Telegram's pinned case uses its historical graph while qwen keeps the current
whole-root graph. Changed bridge/copy parents also have independent current Core
fixture attempts with full parents and source/CST inverses retained. These scoped
attempts establish neither complete parent/crate admission nor repaired semantic
or performance frontiers. All ordinary source, dependency, checker and private
proof checks still run afresh; source data is not a saved compiler verdict.
