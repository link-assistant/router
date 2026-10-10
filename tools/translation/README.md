# Bulk Rust draft translation

Run `node scripts/translate-router.mjs` to translate **every tracked `.rs`
file**, including Rust sources, tests, benchmarks, scripts and archived case
study examples. `node scripts/translate-router.mjs --check` regenerates in
memory and rejects stale, missing or unexpected outputs. For another Git
repository, use `--root /path/to/repository`; the same translator writes the
same relative output layout there. No Rust build, network request or package
installation runs during regeneration.

Each source produces one compact source-bearing structural meta JSON in
`tools/translation/meta`, an executable JavaScript draft in
`packages/javascript/generated/rust-draft`, and a typed TypeScript draft in
`packages/typescript/generated/rust-draft`. Source text is stored only in the
meta JSON. Source and item SHA-256 hashes, UTF-16 and UTF-8 spans, diagnostics,
checked semantic IR, encodings and assumptions remain reviewable there.
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
callables. TypeScript exposes their primitive types and all generated
functions have explicit parameter annotations.

Carried constructs retain exact original source with a structured diagnostic;
they create no callable stub or successful fake behavior. An unsupported
dependency carries every caller. Duplicate declarations are ambiguous and
carried. Async/Tokio, I/O, platform APIs, mutable data, traits/impls, external
modules, generic Option/Result/Vec, closures, conditional compilation and
test attributes remain boundaries. Nested declarations remain inside their
carried enclosing source item. The structural scanner is not a full Rust
syntax validator; a lexical failure carries the full file explicitly.

The integer contract assumes 64-bit usize/isize and checked arithmetic.
Rust release-profile wrapping arithmetic is outside the executable contract;
the artifacts are drafts even for successfully lowered declarations. String
case mapping also depends on Unicode table versions. Rust trim and trim_start
are carried because JavaScript trimming uses a different whitespace set.
These boundaries must be resolved with shared behavior fixtures before any
native Router parity claim.

Validation:

```sh
node --test tools/translation/test/*.test.mjs
node scripts/translate-router.mjs --check
tsc -p tools/translation/tsconfig.json
```

The fixtures exercise returned values, predicates, sibling calls, constants,
overflow and zero-divisor aborts. Tests also check unsupported side effects,
ambiguous names, transitive dependencies, raw strings/nested comments/Unicode
source preservation, all generated JavaScript module loads, and tampered
semantic IR plus stale/missing/unexpected output rejection. The TypeScript
check requires TypeScript 5.9 or compatible tooling and does not emit files.
See [vendor/NOTICE.md](vendor/NOTICE.md) for upstream commits and licensing.
