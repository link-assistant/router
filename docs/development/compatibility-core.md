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
| `json_parse(&Str) -> Maybe<Json>` | Native `serde_json::from_str::<Json>(value).ok()` | Source-selected `float_roundtrip` canonical decoder; success includes `Some(Null)`, while JSON syntax failure is `None`. |
| `json_parse_bytes(&[u8]) -> Maybe<Json>` | Native `serde_json::from_slice::<Json>(value).ok()` | The same decoder with genuine borrowed `u8` slices; invalid UTF-8 is a parse failure. |
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

Optional decoding is an explicit owned library boundary. The existing default
serde parser capability and arbitrary `Deserialize`/error destruction admission
remain unchanged. The owned call requires the complete current facade and leaf,
genuine source-linked call receipts, canonical `Maybe<Json>` layouts and the
exact locked feature/source profile. Native serde parser/allocation/error Drop
internals remain untranslated. Only a parser `Err` is discarded into `None`;
malformed JavaScript adapter values and resource-domain failures throw. The
existing roundtrip limits remain 1 MiB of input, 769 retained mantissa digits,
4,096 digit bounds and recursion depth 128. Subsequent JSON copy/construction
keeps its separate limits above; parsing does not raise them.

The explicit proposal-only CLI is:

```sh
node tools/translation/propose-core-adoption-corpus.mjs --root /path/to/repo --output /outside/fresh-proposal --sequence json-parse
```

It retains full source/CST, dependency inputs, every proposal field and inverse.
The fixed adopter recognizes canonical explicit parse calls followed by `.ok()`
or an ordinary `let Ok(name) = ... else` discard boundary. It emits qualified
owned APIs and `Maybe::Some`, preserving the input evaluation and failure block.
Its canonical-target selector retains the complete balanced argument source,
including nested groups, comments and an optional unary trailing comma. It
rejects multiple arguments and comments that a path or `.ok()` replacement
would delete. A bare target imported directly from `serde_json::Value`, including
grouped and renamed imports, additionally needs one fresh resolved enum binding
in the consumer's actual type namespace and the complete active original import
source. Ancestor-only imports, duplicate or raw imports, globs, conditional or
unknown producers, local aliases and shadowed candidates remain refused. These
extra alias checks do not disable otherwise supported qualified calls. Impl
methods, uncertain include origins and existing macro/loop/producer boundaries
remain outside this selector.

A separate fixed language/repository pass can bind a complete final method chain
rooted at `json_parse[_bytes](borrowed_parameter)?` to a hygienic immutable local
Json. The new inner block covers the entire former tail; the original suffix,
comments and `?` order stay intact. Argument-created owners are not hoisted:
introducing a let semicolon could shorten their temporary lifetime. Both passes
retain original, intermediate and final CST/source, mappings and full inverses.
An already-qualified owned parse tail can enter the same normalization with an
explicit identity first stage. It still needs the current complete owned facade,
primitive leaf and locked Cargo feature/source profile; an owned spelling alone
is not evidence. Compact `?.` and separated question/dot tokens retain the exact
source-aware checks.
The ordinary checker must still prove borrowing, destruction, canonical layouts
and every suffix call, including allocating String conversions. This normalization
does not admit escaped loans or extend the temporary-borrow model.

Unknown owners, producers, binders, macros and custom error handling are retained
as refusals. This is API adoption, not translation of serde internals or a grant
for the rest of the function. Both CST and checked semantic roundtrips remain
required. The separate JavaScript-to-Rust pipeline has no owned parser-operation
rule yet: reverse synchronization and full application coverage remain pending,
even if focused forward JavaScript and strict TypeScript receiving later pass.

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


## Ordinary canonical JSON reader proposals

The fixed `json-readers` sequence proposes ordinary-function substitutions for
canonical `Option<&Json>::and_then(Json::as_str/as_bool/as_u64/as_i64/as_null)`
readers. It reuses the collection-adopter reader kernel; that existing collection
sequence retains its original rendering, source maps and observer schedule.

The language stage introduces one hygienic immutable receiver local and an
explicit canonical Option branch. The repository stage replaces only the newly
generated canonical paths with the source-bound owned `Maybe`/`Json` paths.
Complete original, intermediate and final CST transports, source maps and inverses
remain in each proposal. Receiver trivia, suffix filters/defaults/`?`, branch
placement and source evaluation count are retained. These equations reuse native
Rust Option/serde behavior and existing checked JavaScript scalar readers; their
library internals remain untranslated.

Initial candidates start at a shared canonical Json formal, or a qualified owned
`Maybe<&Json>` formal, with supported literal/borrowed-text-key `get` steps and a
shared-formal `unwrap_or` fallback. Direct canonical imports require fresh actual
source namespace evidence. Unknown imports, competing producers/traits, mutable
or inferred roots, generic or named-lifetime functions, arbitrary receiver calls
and unknown macros remain unchanged. Native spelled `Option<&Json>` formals,
borrowed aggregate readers and `as_f64` are outside this initial selector domain.
The whole independent checker still decides source/type/lifetime/Drop admission;
proposal fields never grant execution. Full parent outcomes stay distinct from
isolated exact-body behavior, and neither provides a whole-crate coverage claim.

To retain complete proposal packets without applying application sources:

```sh
node tools/translation/propose-core-adoption-corpus.mjs \
  --root /path/to/source --output /fresh/outside/path --sequence json-readers
```

The singleton uses the existing exclusive writer, quotas, complete Cargo/source
snapshots and failure receipt. JavaScript/strict TypeScript receiving and the
paired CI-only Rust oracle must pass before claiming actual executable gains.

### Optional compressed proposal packets

Fixed sequences also accept explicit storage-only gzip transport:

```sh
node tools/translation/propose-core-adoption-corpus.mjs \
  --root /path/to/receiving-repository --output /outside/fresh-reader-proposal \
  --sequence json-readers --packet-storage gzip
```

The corresponding API is `proposeCoreAdoptionSequence({root, output}, sequence,
'gzip')`. Omitting the third argument preserves the original plain packet writer,
index schema and receipt. Compression does not change the logical index or any
packet's full decoded bytes, digest, source/CST, metadata, skips, forward mapping
or inverse. The writer stores each logical packet at its path plus `.gz`, writes
`packet-storage.json` with the complete ordered raw/stored associations, and
publishes the original `index.json` last. All compression and manifest hashing
precede the final fresh source and Cargo checks. It never installs source.

`openCoreAdoptionGzipPackets(output)` checks the complete successful index,
sidecar and physical inventory. Read **every** logical `reader.index.packets`
descriptor with `reader.read(descriptor)`, then call `reader.verify()` to rejoin
the full inventory and controls. Each read freshly checks the regular physical
file and identity, complete stored bytes/digest, bounded decoded bytes/digest and
strict UTF-8. This transport is not a source, binding or executable-admission
proof. It retains no decoded packet or semantic verdict cache.

The original 64 MiB per-packet and 1 GiB logical-output limits still apply,
including the transport sidecar; compressed stored/pending output has a separate
384 MiB limit and the existing failure reserve. Receiving monitors also count
snapshots, logs and active external temporary files within their own total
budget. No full-corpus fit, speed or translated-function gain is implied.
Gzip byte identity across engines is not required. Valid additional empty gzip
members may decode to the same exact packet; extra decoded bytes, invalid UTF-8
or a size/digest mismatch fail verification.

Failed runs retain the existing bounded incomplete receipt and partial stored
files, including any `.gz` packets or pending index. The complete reader rejects
incomplete output and any retained failure receipt. Raw-digest and complete
inventory validation are success-only obligations; any bounded diagnostic decode
of failed bytes is non-authoritative. There is no recovery journal or partial
packet acceptance protocol.

The full capture/propose/review workflow is also checked in. From a clean
physical checkout, select its exact full Git HEAD and fresh external run path:

```sh
python3 scripts/propose-core-adoption.py --root ROOT --expected-head FULL_HEAD \
  --output FRESH_EXTERNAL_RUN --sequence json-readers
python3 scripts/review-core-adoption.py --root ROOT --expected-head FULL_HEAD \
  --run FRESH_EXTERNAL_RUN --review-directory review-v1 \
  --review-monitor-directory review-monitor-v1
```

The first controller retains the complete Git/physical compiler, scripts and
Rust/Cargo inputs, including Rust outside `src`, and all 132 installed TypeScript
5.9.3 files before invoking the existing whole-`src` gzip proposal CLI. Source
counts come from that receiving checkout; they are not executable coverage.
The second independently checks every stored and decoded packet, source/profile
join, graph, retained refusal, both language/repository CST stages, full mappings
and inverses. Its fixed adapter requires the current streaming outer trace.
Both freshly rejoin the captured inputs and source HEAD after execution. The
executing controllers and reviewer helpers must themselves be the captured
same-HEAD files; no private temporary script, checkpoint digest updater or
caller-provided semantic verifier is used. Existing upstream profile pins remain
required. This source association does not establish that an unreviewed commit
or copied public metadata is semantically correct.

This reviewed controller currently supports only `json-readers` with gzip.
Other unchanged proposal sequences retain their existing API/CLI contracts and
need their own independent equation adapters before using this workflow.
Proposal and review are read-only with respect to source. Supply the resulting
exact review, installation-plan and index digests to the separate apply command
below only after reviewing the complete outcomes. Explicit fresh review and
monitor names allow a new review without overwriting a failed attempt.

The stock POSIX Darwin/Linux controllers require Python 3, Git, Node and the
installed TypeScript 5.9.3 dependency. Proposal retains its 900-second child,
3 GiB sampled aggregate limit and 1792 MiB Node old-space setting; independent
review retains its 180-second child and 1 GiB aggregate limit. Both count the
complete producer/review/snapshot/pending/log/receipt trees and active external
temporary files within the same 384 MiB observed budget, require 3 GiB initially
free and preserve a 2 GiB reserve. Preflight and finalization remain separately
observed work, rather than a claim that either child deadline covers the entire
controller. Original logical packet/source/CST bounds are unchanged. Failures
retain partial output, logs and RED receipts; no automatic retry, application or
acceptance of an incomplete index occurs. Temporary file removal follows full
archival readback only. Receiving repositories must qualify their full workload
under these bounds; copying this automation guarantees no fit, speed or parity.

To copy this workflow, retain both scripts and
`tools/translation/core_adoption_review.py` plus
`tools/translation/core_adoption_json_readers_review.py` alongside the existing
compiler, profiles, notices and application tools. The current standalone
compiler exporter does not automatically include these Python files. Adapt
repository paths and independent equation rules through reviewed source changes,
without treating a new schema or capture hash as a missing type/owner proof.

A complete reviewed `json-readers` gzip proposal can be applied with
`scripts/apply-reviewed-core-adoption.py apply --root ROOT --run PRODUCER_RUN
--output FRESH_EXTERNAL_OUTPUT --expected-head FULL_HEAD
--review-directory EXACT_REVIEW_SUBDIRECTORY
--review-monitor-directory EXACT_MONITOR_SUBDIRECTORY --review-sha256 REVIEW_SHA
--plan-sha256 PLAN_SHA --index-sha256 INDEX_SHA`. Supply the exact full digests
and exact direct review/monitor subdirectory names (no automatic latest-review
selection). Recovery retains these names in the application state. Supply them
only after the actual complete producer and independent reviewer have passed,
including their final source/resource guards. The controller uses the existing
packet decoder and the checked-in `apply-reviewed-core-adoption.mjs` API. Its
entire preflight, staging, application and receipts share a hard 60-second
POSIX real-time alarm (deadline termination remains RED), 1 GiB
aggregate memory, 384 MiB of producer/review/application/pending/TMP evidence,
3 GiB initial free space and a 2 GiB reserve. These are application bounds;
they do not extend the producer, reviewer or any original test deadline.

The explicit report digests select operational data; a copied approval field,
CST, hash, selection or report does not issue semantic or private owner authority.
Application freshly rejoins all captured original/Git/physical/132-TypeScript
inputs, every complete decoded packet, source inventory, source chain and full
mapping inverses. Each changed parent's complete language and repository CST
stages receive fresh native reconstruction. Unchanged CST packets remain joined
to the exact independently reviewed bytes; namespace and semantic issuance is
not repeated or waived by the applicator. Only exact final Rust source packets
are staged, read back and installed with recoverable, per-file replacements.
The complete worktree update is not atomic, and arbitrary concurrent writers
remain outside this stock-filesystem contract. Keep the source freeze intact.

Failures retain the full preimages, postimages and operation journal. Nothing
rolls back automatically. Explicit recovery uses
`scripts/apply-reviewed-core-adoption.py recover --root ROOT --run PRODUCER_RUN
--output FRESH_EXTERNAL_RECOVERY --application APPLICATION_DIRECTORY
--state-sha256 EXACT_REVIEWED_STATE_SHA`; it freshly checks the original source
context and each saved byte and refuses unrelated later edits. Recovery does
not remove the failed application evidence or restore old inode identities.

Installing a proposal establishes no executable coverage, parity, deadline pass
or generated freshness. Any Rust/Cargo change requires the actual complete
static-source bank refresh. Changes intersecting the native fixture's retained
parents also require a separately reviewed adoption-commit history extension
and actual fixture production. Refresh the isolated compiler and portable Git
exports from their complete selected inputs, then actual canonical/profile and
reverse outputs. If reverse generation changes a Rust witness, refresh the bank
and dependent exports again. Retain all historical sources, callbacks, oracles,
failed runs and original limits; obtain the complete current gate before claiming
completion. The application tool and eight source regressions remain unqualified
until Root receives them; no local Rust execution is authorized.
