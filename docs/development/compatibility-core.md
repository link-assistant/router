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
| `json_copy(&Json) -> Json` | `Clone::clone` on the canonical JSON type | Explicit qualified shared copy into independent checked canonical storage; no general `.clone()` dispatch or custom `Clone` admission. |
| `json_with_field(Json, &Str, Json) -> Json` | By-value native JSON indexing and replacement | Object or null base, literal or checked borrowed scalar-text key and canonical JSON value; null promotes to an object. Other base kinds abort. Copies/results retain the JSON bounds and independent storage. |
| `json_index_str(&Json, &Str) -> &Json` | Shared canonical Value string indexing | Existing node identity; absent keys and wrong kinds return canonical Null. The result borrows its receiver. |
| `json_index_usize(&Json, usize) -> &Json` | Shared canonical Value array indexing | Actual by-value source `usize`, including checked contextual and explicit literals; absent positions and wrong kinds return Null. Other integer identities remain refused. |
| `json_map_index(&Map<String, Json>, &Str) -> &Json` | Shared canonical object-map indexing | Existing node identity; an absent entry panics without insertion. Value indexing retains its different missing-key behavior. |
| `f64_inclusive_contains` | Same-type `Into<f64> + Copy` arguments, widened once before ordered comparisons | Checked `f64` inputs only; IEEE NaN, infinity and signed-zero behavior with once-only left-to-right arguments. Native Rust also accepts `f32`; that does not admit translated `f32` callers. |
| `unicode_scalar_count` | Borrowed `str::chars().count()` | Validated Unicode scalar text to the existing 64-bit `usize` BigInt ABI; one input evaluation, with no general iterator admission. |

Owned JSON retains the existing runtime's 4,096-node and depth-32 limits for the
complete constructed value, including interpolated subtrees and repeated
copies. Dense containers also retain their 4,096-element limit. Individually
valid inputs can exceed the aggregate result limit; those executions remain
outside the translated profile. Literal syntax keeps its separate 65,536-byte,
16-level and 256-node limits. Extending the literal grammar does not raise them.

The two copy/update operations bind the complete owned facade and primitive
source. Direct call arguments evaluate once, left to right. The assignment
adopter first evaluates the complete original RHS in a hygienic local, then
moves the old local into `json_with_field` and reinitializes that same outer
binding. Conditional assignments keep the updated value outside the branch.
Dynamic/nested assignees, nonfresh receivers and unknown aliases remain unchanged
with explicit proposal refusals; no implicit `IndexMut` or `.clone()` theorem is
created.

Functions using these operations also pass a private source-bound whole-function
flow rule. It tracks lexical binding identity, available/moved state,
reinitialization and joins of continuing branches; returning branches and existing
checked enclosing `?` propagation keep their own exit behavior. Only genuine
fresh checked JSON producers open the mutable-JSON local lane. Double moves,
use after move and borrowed-pointee moves remain refused. The closed reader
extension tracks shared canonical JSON/object and derived text loans, including
actual `Option` payloads through checked `let`/`let-else`, `if-let` and branch
joins. It checks the real registered reader signatures, canonical layouts,
shared-reference/Option Copy source and dominating `Some` tests. A loan keeps
its actual lexical input or owned-local root; a separate fresh output document
can update, while consuming or replacing a root with a live loan refuses.

Loan lifetimes are conservatively lexical, so valid Rust non-lexical lifetime
programs can remain unsupported. Borrowed returns must keep an input root and
still pass the ordinary source lifetime proof. Local-root escapes, mutable
references, general matches, callbacks, loops, arrays, unknown retaining source
calls, Result loan/error transfers and unknown aggregate Drop remain refused.
This reader extension is a source draft until its complete receiving tests pass;
retaining a full application's body or selecting a source rewrite is not an
executable coverage claim.
This does not waive the ordinary
checker or establish a general Rust borrow checker, arbitrary `Serialize`,
allocator/OOM or payload Drop equivalence. Native library internals stay
intentionally untranslated.

The three indexing operations use source-bound canonical layouts and receiver
loans. Serialized metadata or a familiar helper name cannot create a borrow
permit. The explicit `json-indices` proposal sequence rewrites whole shared
index-read leaves inside qualified owned JSON interpolation. It retains complete
source, CST, substitutions and inverses, and leaves uncertain aliases, writes,
move-sensitive surrounding expressions and unknown producers unchanged. The
independent semantic checker still decides whether the resulting whole function
can execute. The source adopter and its receiving tests do not establish a
measured application coverage gain.

The shared interpolation grammar distinguishes prefix `!` and binary `||` from
macro bangs and closures. Actual parsing, type checks, purity and supported JSON
conversion remain separate requirements. Logical operands retain short circuit
behavior, and object values evaluate in source order before output-key sorting.

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

node tools/translation/propose-core-adoption-corpus.mjs \
  --root /path/to/receiving-repository --output /outside/fresh-json-updates \
  --sequence json-updates
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

The standalone `json-updates` sequence invokes the actual
`proposeCoreJsonUpdateCorpus` API on a fresh complete receiving source graph and
writes the same complete sequence packet schema. It does not append a fourth
stage to the three-stage JSON sequence or change any old default. To compose the
operations, review and apply the complete `json-algebraic-primitives` proposal
first, then run `json-updates` into a separate fresh output directory. Retain the
full source chain across both operations and undo mappings in reverse operation
and stage order. Each operation retains the original 1 GiB output quota and
other source/packet bounds; actual time, heap and RSS still require receiving
measurements. A proposed update is not evidence that the complete enclosing
Router function has passed later body checks.

The update API accepts `dependencyInputs: {manifest, lock}` too. Its CLI captures
the receiving repository's complete physical Cargo sources and rechecks them
along with the source tree before atomic index publication. They are not
substituted with the compiler repository's dependency inputs. Missing or unknown
producer evidence keeps the same source uncertainty and refusals.

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


The explicit owned `json_map` and `json_filter_map` operations collect eagerly
from a shared canonical JSON slice. Rust executes the real library functions;
the checked target profile visits inputs once in order and accepts only fresh
owned JSON callback results (or actual `Some(Json)`/`None`). Callback-local
updates use the existing linear flow analysis. Captures are limited to immutable
scalars and live shared input roots; captured owned moves, mutation, escaping
loans, unknown source calls/Drop, loops, and callback `?` remain refused.

The new standalone `--sequence json-collections` proposal is explicit API
adoption, with full source/CST mappings and inverses. It does not prove the
original Iterator or Option method dispatch. Closed reader chains are
materialized as hygienic, receiver-once canonical Option `if let` control;
`unwrap_or` retains receiver-before-eager-default order. The full application
chain must first run the existing JSON and JSON-update producers on each fresh
stage. It never assumes original `json!` calls already have owned bindings.
Default sequences and the 1 GiB packet quota stay unchanged.

The successful-resource projection limits the input to a dense immutable array
of 4096 items, retains the actual registered immutable view guard (65536 cells,
depth 1024), and separately validates each input JSON value at 4096 nodes/depth
32. The complete constructed output retains 4096 nodes/depth 32/dense 4096.
The entire expanded function and all callbacks share the existing 100000-cell,
160-depth flow budget and unchanged source-lifetime pass. No cross-call source,
owner, hash or verdict cache is introduced. Allocator/OOM and arbitrary Drop
observations remain outside this bounded projection. These additions are a
source draft until complete Node/Bun and strict TypeScript receiving passes;
the independent Rust oracle is CI-only behind the same-SHA JavaScript gate.
The new checked callback text-match lane is limited to original, source-ordered,
unguarded literal-text alternatives and a final wildcard over one live borrowed
text binding. Guards, binders, aggregate patterns and outside-callback matches
receive no permission from that lane.
