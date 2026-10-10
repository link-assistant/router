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

## Complete native TypeScript draft

The separate `native-typescript.mjs` adapter translates every native JavaScript
module, the portable policy, and the package index/testing wrappers. It uses
the official TypeScript compiler syntax AST, serializes each node's kind and
children plus lexical leaf tokens, reparses that serialized document, and
emits TypeScript. The meta files contain no opaque file or function-body
source field. The compiler version, source/meta/target hashes, node counts,
explicit `any` counts and output asset hashes are recorded in
`generated/native-typescript/manifest.json`.

JavaScript and TypeScript share the runtime language, so this target uses
identity lowering. JSDoc primitive parameter contracts become types; dynamic
parameters, returns, locals and discovered class fields have explicit `any`
draft annotations. Class fields added for typing use `declare` and emit no
runtime property. Strict compilation checks every generated module without
`ts-nocheck`, `ts-ignore` or `ts-expect-error`. Passing strict compilation does
not mean those dynamic types have been inferred or proved.

Each module must also pass an independent structural runtime AST comparison
after type erasure. Only relative `.mjs` module extensions intentionally become
`.js`; neutral parentheses are normalized while optional-chain boundaries are
retained. Evaluation order, receiver binding, async/await and literal data are
checked. Independent executable fixtures cover grouped optional chains,
getters evaluated once, method calls, defaults, short circuiting, regex,
BigInt and raw template data.

Regenerate and check with:

```sh
node scripts/regenerate-native-typescript.mjs
node scripts/regenerate-native-typescript.mjs --check
node scripts/check-native-typescript.mjs
node --test tools/translation/js-to-rust/test/native-typescript.test.mjs
node scripts/check-native-typescript.mjs --out-dir packages/typescript/dist
```

The existing JavaScript package's TypeScript/Ajv dependencies are reused during
repository checks. The generated package records its own dependencies and
contains exact catalog/schema asset copies. Local dependency symlinks and
`dist` output are ignored. `--check` detects stale, missing and unexpected
generated TypeScript, meta and asset files. Cross-worktree development can
pass `--source-root <assembled-repository>` to both scripts and set
`ROUTER_NATIVE_TS_SOURCE_ROOT` for the test.

The runtime test runs the same independently authored native expectations
against original JavaScript in Node, compiled TypeScript in Node, and compiled
TypeScript in Bun when installed. It exercises auth and budgets, provider
storage, HTTP/SSE/Responses, OAuth and managed resources. Compiled JavaScript
is the execution artifact, including managed-server subprocesses; direct
TypeScript source execution is not covered. Shared fixtures temporarily alias
compiled `.js` files to `.mjs` paths and never load original runtime modules
or a Rust fallback. Native feature/endpoint coverage limitations remain those
of the JavaScript draft. This complete TypeScript target does not expand the
bounded Rust translator's supported native I/O or service constructs.
