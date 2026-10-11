# Bulk Rust draft translation

Run `node scripts/translate-router.mjs` to translate **every tracked `.rs`
file**, including Rust sources, tests, benchmarks, scripts and archived case
study examples. `node scripts/translate-router.mjs --check` regenerates in
memory and rejects stale, missing or unexpected outputs. For another Git
repository, use `--root /path/to/repository`; the same translator writes the
same relative output layout there. No Rust build, network request or package
installation runs during regeneration.

The same command also resolves tracked out-of-line module edges from `src/lib.rs`
and `src/main.rs`, or an explicit `--entry TRACKED_RS`. Checked cross-file calls
and explicit crate/self/super imports produce project meta and executable JS/TS
under `tools/translation/projects` and `packages/{javascript,typescript}/generated/rust-project`.
Per-file callers can consume their checked project dependency closure. Ambiguous,
missing, conditional and inline module edges remain diagnostics. External crate
resolution, impls, macro expansion and effects remain unimplemented. Project
counts are separate from per-file counts and are not added to the census twice.

Each source produces one compact source-bearing structural meta JSON in
`tools/translation/meta`, an executable JavaScript draft in
`packages/javascript/generated/rust-draft`, and a typed TypeScript draft in
`packages/typescript/generated/rust-draft`. Source text is stored only in the
meta JSON. Source and item SHA-256 hashes, UTF-16 and UTF-8 spans, diagnostics,
checked semantic IR, encodings and assumptions remain reviewable there.
The inventory counts executable functions, constants, type layouts and
constructor factories separately. Targets consume a serialized and reparsed
checked semantic program; only structural meta retains source text.
`parity/rust-source-inventory.json` exhaustively records source provenance,
output paths, diagnostic frequencies, and executable/carried/preserved
counts. Its name does **not** make draft artifacts runtime parity evidence:
every record explicitly sets `runtimeParity: false`.

The pinned upstream Rust parser/type checker/emitter lower pure functions,
primitive immutable constants, checked machine integers, booleans, immutable
strings, `let`, `if`, supported `match` forms, string predicates and case maps,
formatting, and calls between supported declarations in the same file. The
public draft module exports `translated` and `provenance`. Integer inputs and
results use BigInt. Constants are values in `translated`; functions are
callables. TypeScript exposes checked primitive, readonly array and tagged union types;
all generated functions have explicit parameter annotations.

Carried constructs retain exact original source with a structured diagnostic;
they create no callable stub or successful fake behavior. An unsupported
dependency carries every caller. Duplicate declarations are ambiguous and
carried. Async/Tokio, I/O, platform APIs, mutable aggregates, traits/impls, external
modules, unbounded generics, escaping closures, conditional compilation and
test attributes remain boundaries. Nested declarations remain inside their
carried enclosing source item. The structural scanner is not a full Rust
syntax validator; a lexical failure carries the full file explicitly.

The integer contract assumes 64-bit usize/isize and checked arithmetic.
Rust release-profile wrapping arithmetic is outside the executable contract;
the artifacts are drafts even for successfully lowered declarations. String
case mapping also depends on Unicode table versions. The local checked AST extension supports String::new, to_string/to_owned/as_str,
Rust trim/trim_start/trim_end with explicit Unicode White_Space, ASCII case maps
and comparison, string byte length, scalar count, immutable vec! literals,
Vec::new, and slice/array measurements. Monomorphic Option/Result values
support typed constructors, exhaustive match, predicates and eager unwrap_or.
Generic inference beyond explicit expected types and mutable vectors remain carried. Checked scalar locals and parameters support
assignment, compound arithmetic, while/loop, unlabelled break/continue, statement
if/else and early returns. Slice indexing validates usize bounds and preserves
out-of-bounds aborts. Unit functions return null. Lazy scalar slice iterators support map/filter/take,
collect/count/sum/fold and short-circuit any/all with contextually checked scalar
closures. For loops preserve enclosing returns and loop controls. Bounded primitive integer ranges support exclusive and inclusive endpoints,
including maximum inclusive endpoints without overflowing the iterator. Scalar
array literals preserve order; repetition and fixed-length type contracts remain
carried. Iterator locals, move captures and aggregate borrowing remain carried
until ownership contracts exist. Slice inputs require dense own data
elements; user accessors and iteration overrides do not supply Rust values.
Value expressions containing
nonlocal exits remain refused to prevent IIFE control-flow errors.

Module-local enum layouts and immutable named/tuple/unit structs now emit
typed constructor factories. Struct fields and literal shorthand are checked;
literal fields evaluate in written order before layout reordering. Only accepted
non-behavioral derives are allowed. Unknown field types and unresolved dependencies
remain refused, and constructors do not implement external derive or trait APIs. Arguments reject lone
surrogates, wrong tags and out-of-range fixed integers. Raw literals and Rust
ASCII line continuations normalize semantically while meta source remains exact.
Pure const fn lowers runtime calls only. See [extensions/NOTICE.md](extensions/NOTICE.md)
for the adaptations; original vendored bytes remain unchanged. These boundaries
need broader behavior fixtures before any native Router parity claim.

Validation:

```sh
node --test tools/translation/test/*.test.mjs
node scripts/translate-router.mjs --check
node tools/translation/check-typescript-fixtures.mjs
tsc -p tools/translation/tsconfig.json
```

The fixtures exercise returned values, predicates, sibling calls, constants,
overflow and zero-divisor aborts. Tests also check unsupported side effects,
ambiguous names, transitive dependencies, raw strings/nested comments/Unicode
source preservation, all generated JavaScript module loads, and tampered
semantic IR plus stale/missing/unexpected output rejection. The TypeScript
check requires TypeScript 5.9 or compatible tooling and does not emit files.
See [vendor/NOTICE.md](vendor/NOTICE.md) for upstream commits and licensing.
