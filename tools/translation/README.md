# Bulk Rust draft translation

The source-only tool-attribute draft verifies original Rust 1.89 resolver bytes
before proving an unshadowed `rustfmt::skip` owner in active ancestor scopes.
Bounded builtin inner lint lists retain their original syntax. Unknown expansion,
tool imports/shadows, disabled preludes and macro-bearing input stay refused.
This profile preserves attribute metadata and does not implement formatting or
procedural behavior; its focused verification is pending.

Run `node scripts/translate-router.mjs` to regenerate every tracked `.rs` file,
including production sources, tests, benchmarks, scripts and archived examples.
Run the same command with `--check` to reject stale, missing or unexpected outputs
without writing files. Regeneration runs JavaScript; it requires no Rust build,
network request or package installation.

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

Unbounded generics, arbitrary trait implementations, aggregate mutation,
unresolved derives/macros, ambiguous imports, compilation conditions and
unsupported reference ownership remain refusals. The structural scanner is not a
full Rust syntax validator; lexical failures carry the affected source.

The integer profile assumes 64-bit `usize`/`isize` and checked overflow, matching
debug/test behavior. Release wrapping arithmetic requires a separate contract.
Unicode case mapping depends on source and host tables. Alternate serde_json
features require a separately validated profile. Rust differential execution
remains gated on the JavaScript checks.

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
licenses. They are portable compiler source inputs (about 715 KB compressed),
not installed dependencies. A different manifest or lock leaves these derive
namespaces unresolved with an explicit unsupported-profile diagnostic; it
does not grant the registered derive owners or stop unrelated translation.

The future binary64 literal draft verifies `source-profiles/floating-standard`
before lexical adaptation. Its bounded decimal-to-binary converter uses exact
integer ratios and one ties-to-even rounding, retaining the written token and
result bits. It supports binary64 literals only; binary32, overflowing literal
lint profiles and floating constant evaluation remain unsupported. The two
original compressed Rust 1.89 source inputs total about 15 KB. This draft awaits
compiler and behavioral verification and supplies no additional runtime claim.

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
