# Bulk Rust draft translation

The future standard namespace census derives stable public type names from
original Rust 1.89 declarations and the explicit std → alloc → core reexport
chain. It registers incomplete named formatting type facts without layouts,
constructors, globs or runtime formatting. Source byte hashes and spans accompany
each fact. All 72 focused Node and Bun cases passed, including strict
TypeScript execution, copied-bundle regeneration and source archive tamper
refusals. The complete combined repository gate remains required.

The source-only tool-attribute draft verifies original Rust 1.89 resolver bytes
before proving an unshadowed `rustfmt::skip` owner in active ancestor scopes.
Bounded builtin inner lint lists retain their original syntax. Unknown expansion,
tool imports/shadows, disabled preludes and macro-bearing input stay refused.
This profile preserves attribute metadata and does not implement formatting or
procedural behavior. Focused Node and Bun verification passed, including
strict TypeScript execution and unchanged reverse-generated Router predicates.
The full combined repository gate remains required before publication.

Run `node scripts/translate-router.mjs` to regenerate every tracked `.rs` file,
including production sources, tests, benchmarks, scripts and archived examples.
Run the same command with `--check` to reject stale, missing or unexpected outputs
without writing files. Regeneration runs JavaScript; it requires no Rust build,
network request or package installation.

The whitespace iterator draft includes a reproducible table lift:
`node tools/translation/generate-whitespace-data.mjs --check` verifies the original
Rust 1.89 archive inputs, lifts the Unicode property into data meta, reparses it
and compares the emitted JavaScript table and meta artifact. Omit `--check` to
write those two artifacts. This bounded property lift uses no Rust build or host
whitespace regex; it grants no crate namespace or complete runtime authority.
The 24-file focused batch, including 15 new cases and the complete Unicode scalar
table check, passes all 144 cases in Node and Bun at `f42be70a`. The
[paired evidence](../../docs/case-studies/issue-759/current/source-whitespace-f42be70a/README.md)
retains the initial two diagnostic expectation failures and complete repaired runs.
Full-corpus gains and complete runtime parity still need independent verification.
The borrowed `str` identity guard also refuses source type/import shadows and
unresolved type scopes before the inherited parser can apply its shortcut.

The executable path is Rust syntax → checked semantic meta representation →
serialization and reparsing → JavaScript and TypeScript emission. The copied
upstream parser, checker and emitter remain pinned and hash checked. Generic
extensions live outside the vendor directory. A host contract describes an
operation such as a duration comparison or JSON access; it does not replace a
Router function body. Original bodies and their resolved dependencies still pass
through the frontend and semantic checker.

## Outputs and evidence

Each source produces source-bearing structural meta JSON in
`tools/translation/meta`, a JavaScript draft in
`packages/javascript/generated/rust-draft`, and a TypeScript draft in
`packages/typescript/generated/rust-draft`. Source text appears in the meta JSON;
source and item hashes, UTF-16 and UTF-8 spans, diagnostics, checked semantic IR,
encodings and assumptions remain inspectable there.

Project translation resolves library and binary entry points, file and inline
modules, supported import aliases and actual declaration dependencies. Its meta
artifacts live in `tools/translation/projects`; emitted dependency closures live
in the corresponding `generated/rust-project` package directories. Shared or
static inherent methods are checked separately against their original source
spans. An enclosing `impl` remains carried when only some methods translate.

`parity/rust-source-inventory.json` records the complete tracked source census,
translator implementation hashes, output paths, diagnostic frequencies and
coverage. Functions, constants, data types, constructor factories and checked
methods have separate counts. Archived examples and helper factories are not
production function execution evidence. Consult the generated inventory for
current counts; this document does not freeze them.

Generated modules export `translated` and `provenance`. The keys in `translated`
retain source declaration names, including when JavaScript identifiers require
renaming. Fixed integers use BigInt. Constants export values, functions export
callables, and supported data declarations export constructor factories.
TypeScript uses explicit parameter types, readonly arrays and recursive tagged
union aliases for checked layouts.

Literal source `[T; N]` arrays retain their exact size in semantic meta, runtime
guards and TypeScript's readonly length type. The checked subset admits scalar,
borrowed `str` and nested fixed arrays with Copy elements; value boundaries take
immutable snapshots so JavaScript aliases cannot mutate a returned Rust value.
Lengths are bounded at 4,096 and total cells at 16,000. Draft repetition lowers
non-const operands into a checked let followed by repeated Copy values, preserving
one evaluation even for zero elements. Const-item/block operands have different
[evaluation-count rules](https://doc.rust-lang.org/reference/expressions/array-expr.html#array-expressions)
and retain refusals, as do general constant sizes, aggregate references and
non-Copy elements. A source array does not implicitly become a `Vec` or borrowed slice.
Zero repetitions retain the operand's expected element lifetime obligation,
following the pinned [Rust 1.89 type checker](https://github.com/rust-lang/rust/blob/1.89.0/compiler/rustc_hir_typeck/src/expr.rs#L1899-L1913).

Draft Copy proofs distinguish a source-resolved `std::fmt::Display` implementation
from Copy, Clone and Drop obligations. The profile retains the exact original
header and a closed type namespace, with pinned Rust 1.89 owner definitions;
unknown, shadowed, conditional and unsafe implementations remain refused.
The incomplete `Display` and `PathBuf` namespace tables supply no formatter,
path runtime behavior, constructor or glob completeness.

An unsupported construct retains its exact source and diagnostic. It supplies no
callable stub. Unsupported dependencies carry their callers, and ambiguous or
conditional declarations require resolution before emission. Every draft and
project retains `runtimeParity: false`; successful emission is not whole-program
behavioral parity. Native Router readiness is checked separately and continues to
refuse incomplete operation or route coverage.

## Checked capabilities

The frontend supports primitive constants and functions, checked integer
arithmetic, immutable strings and arrays, local scalar mutation, branches,
supported exhaustive matches, early returns, bounded loops and slice indexing.
Immutable records and algebraic constructors retain written field evaluation
order. Typed scalar closures and generator-based iterators preserve lazy
evaluation, short circuiting and panic timing.

Monomorphic standard `Option` and `Result` values support checked constructors,
predicates, supported callbacks and identity-error propagation. Standard-library
behavior requires resolved type provenance; an unrelated enum with `Some` and
`None`, or `Ok` and `Err`, does not acquire those operations. Actual checked
inherent methods take precedence over a standard-looking method spelling.

Registered filesystem and environment reads use scoped host capabilities and
typed errors. Supported async bodies return lazy futures, with host effects
starting when polled. Rust 2024 unsafe environment mutation is refused until
unsafe call-site authorization is checked. Escaping futures, cancellation and
external scheduling remain obligations.

Registered serde_json contracts use the pinned default Value/Number/Map profile.
Recursive schemas validate actual layouts, and explicit registered refinements
enforce finite JSON numbers, normalized durations and canonical UTF-8 map key
order. General IEEE floating-point values retain their broader domain. Duration,
vector-reader and fixed-integer parsing adapters have independent source-derived
fixtures; an adapter alone does not make a Rust caller executable. The checked
frontend must consume its contract and establish the caller’s dependencies.

Pattern syntax and projection planners handle supported nested constructors,
records, literals, alternatives and actual tuple layouts. Syntax or projection
success alone does not prove constant-name resolution, constructor style,
irrefutability, copying, moves or borrows. Those obligations must be established
at each frontend integration point.

The tuple/unit match draft sends original structural patterns through
that planner before normalizing anonymous products to the existing matrix ABI.
Unit becomes a wildcard only after its actual unit type is checked. Original
patterns remain in checked and reparsed target metadata; source identity,
immutable scalar bindings, first-arm priority, exhaustiveness and finite
Cartesian bounds remain mandatory. Its 13 new cases pass in the combined focused
batch; the two pinned whole-file frontiers claim no corpus gain.

The inference draft derives contextual-free tuple
layouts from actual checked bool, unit and Rust fixed-integer fields, including
recursive scalar products. It shares the contextual tuple name encoding,
retains primitive identities, adds inferred layouts to the checked semantic
tree and preserves source-order field expressions. Nine new cases, including
per-file bulk emission with actual project declarations and source scopes, pass
with the tuple matches in the 26-file batch: 194 cases in both Node and Bun at
`fe422f75`, with no skips. The
[paired evidence](../../docs/case-studies/issue-759/current/source-tuples-fe422f75/README.md)
retains all initial failures and the finite per-fixture timeout repair.
Unspecified integer defaults, borrows, owned fields, nominal fields,
floats and mutable aggregates remain refusals; char Pattern and enclosing
namespace closure still require additional contracts. Bounds are 32 fields,
32 levels, 16,000 validation cells, 1,024 new layouts and 8,192-byte names.

The project checker batches independent original data-layout and function-signature
type refusals before any body becomes checked IR. Bulk projects additionally
collect independently attributed original free-function body errors after the
signature phase. The failed checker is discarded, exact owners are removed and
every survivor and caller is checked again. Methods, constants, generated
declarations, missing attribution and internal errors keep ordinary handling;
lifetime, constant and source-proof obligations remain
mandatory. All 155 cases in the 18-file Node and Bun batch pass at `39277c56`.
The [paired evidence](../../docs/case-studies/issue-759/current/source-declaration-refusals-39277c56/README.md)
retains complete inputs and logs. This focused result claims no measured producer
speedup, whole-corpus gain or complete gate success. The
[body evidence](../../docs/case-studies/issue-759/current/source-body-refusals-ed3ab766/README.md)
also retains 182 focused and nine original-source cases in each engine.

Actual lifetime-only free-function binders retain original names, spans and
tokens, checked shared-reference identities and every contributing call-input
constraint. Primitive str identity, local/return origins, reserved names and
lifetime token adjacency stay checked. Condition syntax retains record exclusions
through operands while explicit parentheses/call arguments use ordinary contexts.
Fourteen new lifetime and four context cases pass within the 24-file, 158-case
Node/Bun batch at `43e478789`; the
[complete evidence](../../docs/case-studies/issue-759/current/source-named-lifetimes-43e47878/README.md)
retains both failed phases. The unchanged OpenAI function verifies full syntax;
provider trait dispatch and full original graph execution remain separate.

Unbounded generics, arbitrary trait implementations, aggregate mutation,
unresolved derives/macros, ambiguous imports, compilation conditions and
unsupported reference ownership remain refusals. The structural scanner is not a
full Rust syntax validator; lexical failures carry the affected source.

The integer profile assumes 64-bit `usize`/`isize` and checked overflow, matching
debug/test behavior. Release wrapping arithmetic requires a separate contract.
Unicode case mapping depends on source and host tables. Alternate serde_json
features require a separately validated profile. Rust differential execution
remains gated on the JavaScript checks.

Pinned Rust 1.89 Option `unwrap_or`/`unwrap_or_default` bodies and primitive
Default macro expansions now pass through the ordinary shared checker and
JavaScript/strict TypeScript emitter. Source selection, original body rechecking,
actual receiver ownership and parameter evaluation order are retained. At
implementation commit `2bf7c3c3d`, both engines passed the 261-case focused suite
and the unchanged 262-case original-source regression suite.
[Complete attempt evidence](../../docs/case-studies/issue-759/current/source-standard-bodies-2bf7c3c3/README.md)
retains earlier failures and source fingerprints. Complete core namespaces,
custom/derived Default, destruction, mutable borrowed-local flow and corpus
admissions remain separate obligations; no Rust build ran.

## Reuse and validation

For another Git repository, run:

```sh
node scripts/translate-router.mjs --root /path/to/repository
node scripts/translate-router.mjs --root /path/to/repository --check
```

The translator reads that repository’s tracked Rust files and writes the same
relative output layout there. Runtime assets use relative imports and are copied
into generated packages. No additional checkout or Rust build is needed.

To relocate the forward translator, copy `scripts/translate-router.mjs`, the
top-level `.mjs` files in `tools/translation`, and its `extensions`, `vendor` and `source-profiles`
directories, preserving their paths, notices, licenses and upstream lock. Copy
`fixtures`, `test` and `tsconfig.json` when carrying its validation suite. Source
code suffices for regeneration; copying existing generated corpora is optional.

`source-profiles/derive` contains the original compressed locked dependency
sources and Rust core source used by namespace proofs, with their hashes and
licenses, including the bounded Rust 1.89 builtin Default expansion profile.
They are portable compiler source inputs (under 750 KB compressed),
not installed dependencies. A different manifest or lock leaves these derive
namespaces unresolved with an explicit unsupported-profile diagnostic; it
does not grant the registered derive owners or stop unrelated translation.

The original derive input grammar preserves lifetime and type parameter names,
optional nongeneric path defaults such as `OperationResult<T = Value>`, and
literal Schemars range/length bounds. It retains exact original tokens and spans
and confines bounded namespace outputs using the pinned Syn and Schemars
sources. This permits independent declarations in the same original scope to
be checked. Generic instantiation, referenced schema type resolution, generated
trait execution and bang-output closure still require separate implementation.
The existing nongeneric Serde output routes refuse these generic inputs. The
independent builtin Copy proof can retain its zero-associated-item namespace
sink for a bounded generic header; it grants no copying or trait execution.

The future binary64 literal draft verifies `source-profiles/floating-standard`
before lexical adaptation. Its bounded decimal-to-binary converter uses exact
integer ratios and one ties-to-even rounding, retaining the written token and
result bits. It supports binary64 literals only; binary32, overflowing literal
lint profiles and floating constant evaluation remain unsupported. The two
original compressed Rust 1.89 source inputs total about 15 KB. Independent
rounding boundaries, syntax and refusal cases passed in Node and Bun, together
with strict TypeScript execution. These checks do not establish complete Router
parity or floating constant evaluation.
`source-profiles/declarative` separately retains the exact locked Tokio archive
and original Rust thread-local macro branch sources. The bounded declarative
engine preserves captured fragment opacity, original tokens and definition-site
`$crate` evidence. Its draft source expansions and observed declarations supply
no macro owner, complete namespace or generated runtime authority. Unsupported
fragments, ambiguous repetitions and unresolved nested expansions remain explicit.

The borrowed-string membership draft retains six original Rust 1.89 files in
`source-profiles/slice-membership` (95,996 bytes compressed), together with their
manifest and licenses. It checks actual `&str` elements, one shared needle borrow,
and source-known slice, default `Vec` or fixed-array receivers. Vec/array
adjustment additionally requires a closed value-only source namespace so an
earlier trait method cannot replace slice membership. Its descriptor
runtime validates dense own data elements before content comparison; proxy,
accessor, custom-trait and escaping temporary-borrow cases remain unsupported.
Shared fixed-array inputs retain the existing unsupported Copy/lifetime
prerequisite; by-value source fixed arrays remain checked.
The focused tests read three whole unchanged Router files and execute four
predicates against independent expectations in JavaScript and strict compiled
TypeScript. Archived execution evidence is separate from the initial draft
receipt: `fixtures/slice-membership-validation/receipt.json` records the complete
58-case Node/Bun check of a clean source commit and references all earlier raw
failure and repair logs. No generated-corpus gain, complete namespace authority or Router parity
is claimed by this profile.

With Node, Bun and the repository’s TypeScript tooling available:

```sh
node --test --test-concurrency=2 tools/translation/test/*.test.mjs
bun test tools/translation/test/*.test.mjs
node scripts/translate-router.mjs --check
node tools/translation/check-typescript-fixtures.mjs
tsc -p tools/translation/tsconfig.json
```

Set `ROUTER_TRANSLATION_TSC` to a compiler path when `tsc` is not on `PATH`.
Run these commands sequentially: several behavioral fixtures invoke TypeScript
compilers, and the Node file limit bounds the number of concurrent fixture
workers. The complete local gate and CI use the same two-worker limit for the
forward translator suite.
Independent fixtures check values, overflow, laziness, effect order, domain
rejection, source spans, malformed semantic IR and deterministic regeneration.
Original-source tests pin Rust body hashes and expected observations; temporary
artifact loaders execute the emitted module with its generated runtime assets.
TypeScript checks use strict compilation and do not establish behavioral parity
without corresponding execution evidence.

See [extensions/NOTICE.md](extensions/NOTICE.md) for local adaptations and
[vendor/NOTICE.md](vendor/NOTICE.md) for upstream references and licensing.

The source-only `declarative-closure.mjs` layer records privately checked expansion lineage, original definition provenance, nested calls and generated attributes. Its conditional partition receipts keep unknown cfg atoms symbolic and select no platform. Neither such a receipt nor supplying a pinned transcriber resolves a macro call owner: all namespace and runtime authority remains false until independent ownership, hygiene, attribute and confinement obligations are closed.

`derive-success-frontier.mjs` inventories written quote templates from the original locked Serde generator sources for a narrower nonempty unit-enum candidate. Its sealed evidence records splices, generated attributes and the fixed empty macro expansion without choosing generator branches or resolving call owners. This module is not consumed by the binder; every namespace dimension and generated-trait authority remains false.

The bulk project checker additionally collects bounded semantic refusals from
independent original free-function bodies, discards the failed checker, then
checks every survivor and caller again. Ordinary checking retains first-error
behavior; `collectIndependentBodies: false` selects that comparison in a bulk
project. Methods, generated declarations, constants and post-check proofs retain
ordinary handling. All 182 focused cases and nine unchanged-original-context
assertions passed in Node and Bun with JavaScript and strict TypeScript execution.
[Complete body-refusal evidence](../../docs/case-studies/issue-759/current/source-body-refusals-ed3ab766/README.md)
retains all logs, the Node TAP receipt-reader failure and its independent metadata
correction. These descriptive runs establish no controlled speedup, new corpus
census, complete native parity or JavaScript-to-Rust completion.

The optional derive bang-output context composes source-selected Serde and builtin
quote/AST syntax while retaining genuine original module views and invocation
identities. It narrows only independently closed per-invocation bang obligations;
ordinary project/bulk translation does not enable this consumer automatically.
The 103-case Node/Bun scope passed with complete failed-attempt provenance in
[the derive verification archive](../../dev/log/issues/759/translator-derive-bang-verification/manifest.json).
Generated trait behavior, type/value/effect authority and complete runtime parity
remain separate obligations. CatalogRecord syntax metadata uses a measured
524,288-byte cap independent of the unchanged 256,000 token-byte, 16,000-cell and
64-depth limits.
