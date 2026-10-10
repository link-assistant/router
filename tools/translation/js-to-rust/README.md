# JavaScript-first executable translation

`packages/javascript/portable/**/*.mjs` is authoritative. Regenerate with
`node scripts/regenerate-js-first.mjs`; verify with the same command and
`--check`. Both Rust and strict TypeScript are emitted after serializing and
reparsing the checked AST as a Links Notation document. The generated IR is
`generated/policy.lino`. No function names or implementations are hard-coded in
the translator. Adding an annotated portable function automatically adds both
target functions; fixtures must independently specify its expected behavior.

The small frontend, lexer, checker, Links serialization and construct-map
snapshot comes from the public formal-ai PR #1188, pinned and hashed in
`provenance.json`. The executable/carry boundary of meta-language PR #201 was
reviewed too. This adapter extends the reused AST for local mutation, while
loops, primitive string concatenation and UTF-16 string lengths. It does not
use carried source as an executable target implementation.

Supported syntax: JSDoc `number`, `boolean`, `string` functions, primitive
literal constants, arithmetic/remainder and strict equality/comparisons,
boolean short circuit operators, conditional expressions, sibling function
calls, const/let locals, assignment to let locals, braced if/else, while and
returns. Supported calls are two-argument Math.min/max, Math.abs/floor/ceil/
sqrt/trunc, Number.isFinite/isNaN and string startsWith/endsWith/includes.
Default parameters, imports, async/await, classes, arrays/objects, callbacks,
templates, exceptions, for loops, coercive operators and unknown calls are
refused explicitly. Minimal examples live in `parity/fixtures/js-first/unsupported.json`.
Source positions use UTF-16 offsets. Names must round-trip between JavaScript
camelCase and Rust snake_case; shadowing is conservatively refused.

The number encoding is binary64, including NaN and signed zeros. Math.min/max
use generated runtime helpers because Rust's f64 min/max discard NaN.
Arguments must have their annotated primitive types. The shared string domain
is Unicode scalar strings; Rust String cannot represent JavaScript unpaired
surrogate inputs. String lengths explicitly count UTF-16 units. The fixture
IR interpreter has an iteration limit for tests; generated target loops have
the source's termination behavior.

The manifest `parity/js-first-translation.json` records source/target hashes,
the supported subset, independent fixture provenance and refusals for every
top-level item discovered in `packages/javascript/native/**/*.mjs`. That census
updates on regeneration as native source evolves. The manifest explicitly
states that the whole native implementation is not translated. Native I/O,
stateful services and protocol glue remain separate code.

Run `node --test tools/translation/js-to-rust/test/*.test.mjs`. The tests execute
58 authored fixtures against authoritative JavaScript, an independent IR
evaluator and strict-compiled TypeScript; they also check ordinary source
mutations, serialization, refusal propagation and source/target drift.
Generated Rust embeds the same fixture assertions for the later gated Rust CI
stage. Local Rust compilation is not required or run. Generated Rust items
carry `#[rustfmt::skip]` so regeneration remains a Node-only operation while
the crate's formatting check stays deterministic. No npm runtime dependencies
or large upstream checkout are needed.

Public module `translator.mjs` exports:

- `analyzeJavaScript(source)` returns `{fragment, program, items, diagnostics}`
  with partial item coverage and explicit refusals.
- `translateJavaScript(source)` returns the same fields plus `{meta, rust,
  typescript}` and rejects any refused source item.
- `parseMeta(text)` checks the serialized Links document.
- `emitRust(program)` and `emitTypeScript(program)` emit checked IR.
- `TranslationError` has a `diagnostic` containing `kind`, `message`, `span`
  and a compact source `example`.
