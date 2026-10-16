# Translate application code through a compatibility core

Prioritize rules that remove common blockers in actual Router functions. Rank
the generated project diagnostics before selecting a batch, then measure newly
executable application functions after regeneration. A function's first refusal
identifies an opportunity; removing it can expose further missing behavior.

The compatibility core provides matching Rust and JavaScript abstractions for
selected library operations. Its Rust implementation may delegate to the standard
library or an existing dependency. Its JavaScript implementation may use a native
implementation or an already checked runtime helper. These library internals can
remain untranslated. Their implementation status and behavioral obligations stay
explicit; an API declaration or stub does not establish equivalence.

## Contracts and translation rules

Give each operation a stable identity, concrete parameter and result types,
evaluation order, ownership requirements, observable effects and error behavior.
Declare the supported domain and retain refusals outside it. Reuse existing
checked formatting, numeric, tagged-value and collection helpers where suitable.
JavaScript coercion, floating-point formatting, integer overflow and collection
iteration order must not silently replace Rust behavior.

Bind a contract to the actual owned Rust facade and its qualified source symbol.
Retain the facade source and matching JavaScript implementation. A caller-supplied
flag, an unqualified spelling or copied metadata cannot establish that binding.
New contracts do not require translating every internal standard-library body;
they require an explicit implementation boundary and independent behavioral
evidence for the operation being used.

Use the lossless CST extension in the actual source path, including serialization
and reparsing. Reusable language rules check operands and lower the operation to
checked semantic meta. Repository rules bind Router's facade paths, imports and
output conventions. Preserve the separate serialized, reparsed semantic check
before emission. Both rule sequences remain explicit and extensible.

Automate application migrations with CST substitutions and retained before/after
source. Resolve the selected binding before rewriting a library call; skip and
report ambiguous imports or shadowing. Keep migration tooling reusable. Generated
targets come from the translator, rather than manual patches.

## Verify and measure the batch

Use shared, independently authored cases for both implementations, including edge
cases, evaluation order, errors and effects. Execute JavaScript and strict
TypeScript locally in complete focused files. Add matching Rust oracle source,
but run no Rust locally during issue #759. Rust executes in CI only after every
required JavaScript stage passes for that same commit.

Test the new rules on actual Router function bodies and preserve their full CST,
checked meta and target artifacts. Report application translation coverage,
runtime feature parity and intentionally untranslated library implementations
separately. A successful primitive fixture does not establish that every caller
is translated. Regenerate the full corpus, inspect remaining refusals and run the
complete JavaScript gate before claiming full coverage or synchronization.

## Owned interface families

The Rust library internals below remain intentionally untranslated. Qualified
owned API uses are source-bound to the complete facade and checked again against
the JavaScript runtime's supported domain; aliases do not waive borrowing,
destruction, type checking or later body refusals.

| Owned interface | Rust delegation | Checked JavaScript domain |
| --- | --- | --- |
| `Text` | `std::string::String` | Existing owned UTF-8 text representation and operations. |
| `Str` | `std::primitive::str` | Existing borrowed text references with supported source lifetimes; distinct from owned `Text`. |
| `Json` | `serde_json::Value` | Existing registered tagged immutable JSON values, supported scalar/accessor operations and numeric domains. |
| `Maybe<T>` | `std::option::Option<T>` | Existing canonical variants and supported payload, lifetime, ownership and Drop rules; no blanket `Try` support. |
| `Outcome<T, E>` | `std::result::Result<T, E>` | Existing checked success/error variants and supported payloads; no blanket error-conversion support. |
| `format!` | `std::format!` | Existing checked literal format grammar and supported primitive operands. |
| `json!` | `serde_json::json!` | Bounded literal objects, arrays and scalars; checked borrowed text, booleans, canonical JSON copies and fixed integers through 64 bits. Each interpolation retains its actual type, effects and outer `?` behavior. Custom `Serialize`, floating point, owned text and effectful interpolation remain refused. |
| `f64_inclusive_contains` | Same-type `Into<f64> + Copy` arguments, widened once before ordered comparisons | Checked `f64` inputs only; IEEE NaN, infinity and signed-zero behavior with once-only left-to-right arguments. Native Rust also accepts `f32`; that does not admit translated `f32` callers. |
| `unicode_scalar_count` | Borrowed `str::chars().count()` | Validated Unicode scalar text to the existing 64-bit `usize` BigInt ABI; one input evaluation, with no general iterator admission. |

Owned JSON retains the existing runtime's 4,096-node and depth-32 limits for the
complete constructed value, including interpolated subtrees and repeated
copies. Dense containers also retain their 4,096-element limit. Individually
valid inputs can exceed the aggregate result limit; those executions remain
outside the translated profile. Literal syntax keeps its separate 65,536-byte,
16-level and 256-node limits. Extending the literal grammar does not raise them.

## Produce portable source-adoption proposals

The checked-in producer reads a complete physical `src` tree, requires a fresh
output directory outside the receiving repository, and never installs sources.
Its parent directory must already exist. Temporary receiving repositories need
no Git metadata. The coordinator separately records the actual source revision,
compiler closure and TypeScript dependency used for an integrated run.

```sh
node tools/translation/propose-core-adoption-corpus.mjs \
  --root /path/to/receiving-repository --output /outside/fresh-literal-proposal \
  --sequence literal

node tools/translation/propose-core-adoption-corpus.mjs \
  --root /path/to/receiving-repository --output /outside/fresh-composed-proposal \
  --sequence literal-algebraic

node tools/translation/propose-core-adoption-corpus.mjs \
  --root /path/to/receiving-repository --output /outside/fresh-scalar-proposal \
  --sequence scalar-count

node tools/translation/propose-core-adoption-corpus.mjs \
  --root /path/to/receiving-repository --output /outside/fresh-json-proposal \
  --sequence json-algebraic-primitives
```

The fixed sequences adopt literal text conversions alone, or literal text
followed by transparent algebraic aliases. The second stage uses the complete
first-stage result and constructs a fresh module graph. The standalone
`scalar-count` sequence replaces source-resolved borrowed owned-core text
`chars().count()` calls with the qualified owned scalar-count operation; it
keeps the native iterator implementation outside the translated library boundary. Each stage writes all
returned fields in their original key order, full source and graph/CST records,
selections, uncertainty reports and per-file substitutions with verified complete
inverses. Reverse stage order to recover the original source. A single full API
proposal is retained at a time; actual memory use still needs receiving checks.
The async API is `proposeCoreAdoptionSequence({root, output}, sequence)`.

The `json-algebraic-primitives` sequence adopts source-resolved JSON calls, then
transparent algebraic aliases and primitive aliases. Every stage consumes the
complete preceding source map and builds its own module graph. The JSON rule
binds the complete owned facade and delegates to the existing checked JSON
runtime. Import uncertainty and declaration producers retain explicit refusals.
An exact function body checked inside an authored isolated carrier demonstrates
that body's behavior; it does not establish its original parent module or crate
is translated. Use full-corpus generation to measure application coverage.

The literal, scalar and JSON corpus APIs also accept optional own-data
`dependencyInputs: {manifest, lock}` containing the caller's complete Cargo
source. Exact registered inputs let the rule discover declaration-kind and
macro-only import candidates from pinned package modules and public reexports.
Missing or different inputs leave external imports unclassified. This evidence
does not grant type ownership, complete namespaces, trait dispatch or executable
admission; unknown traits and declaration producers remain refused.

The explicit CLI sequences capture optional physical `Cargo.toml` and
`Cargo.lock` themselves, retain complete source/identity packets, and recheck
them before publishing a completed index. They never substitute the compiler
repository's Cargo files for a receiving repository's files. The original
formatter/primitives API and default CLI keep their existing input contract.

The original `proposeCoreAdoptionCorpus({root, output})` API and CLI without
`--sequence` keep the original formatting-then-borrowed-text sequence and packet
schema. New sequences use `router-core-adoption-sequence-packets-v1`. All share
the existing source, packet and output quotas, exclusive output ownership and
atomic final `index.json` publication. On failure, partially written evidence
has an incomplete receipt rather than a completed index. Inspect every packet,
source chain and inverse before applying actual producer bytes. A selected edit
or a successful proposal is not an executable coverage gain: regenerate checked
meta and targets, measure actual application functions, and run receiving checks
before reporting gains or parity.
