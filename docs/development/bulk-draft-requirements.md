# Complete requirement draft for issues #759 and #772

The user requires all remaining implementation work to be drafted before any
further tests or experiments. Source review and source editing continue; all
new runtime, rule, test and workflow changes remain unverified. Do not start
trial generation, verification compiler checks, benchmarks, local tests or
compilation during this phase. The user's 2026-10-27 update permits periodic
source checkpoint pushes every few hours even when they start CI. Do not inspect
CI status/logs/artifacts/review feedback, wait for completion, or begin CI-driven
repairs until the entire source draft exists. Preserve every same-SHA JavaScript
gate before fatal Rust CI; checkpoints certify no coverage or passing checks.
See [the publication policy](bulk-draft-publication.md).
Automated source writing may construct implementation files,
with all resulting changes marked unverified. No local Rust tools are permitted
in any phase of this task.

This ledger describes implementation obligations, not completion percentages.
The historical 163/2,570 executable function result is not a fresh census.
Preserved Rust source and generated placeholders do not count as translated
application behavior. Every row remains open until its entire source draft is
present; verification and delivery remain separate later obligations.

| Requirement | Existing implementation | Remaining source draft |
| --- | --- | --- |
| Physical language layout | `js/src`, `ts/src`, `rust/src`; layout-aware tooling | Remove remaining assumptions about root `src` in active translation and adoption paths. |
| Reusable ordered rules | Language and repository rule sequences | Cover the remaining source constructs, keep inverse mappings and explicit refusals; no semantic admission from a spelling or source hash. |
| CST/meta boundary | Lossless source transport and separate checked semantic program | Complete every new forward/reverse path with serialization, reparsing, source spans and full source inverses. |
| Common application operations | Formatting, text, numbers, JSON, Option/Result, pure HTTP values, vector readers and selected effects | Complete collection mutation, iterator/callback combinations, error propagation, state, network HTTP, filesystem and streaming contracts with matching native abstractions. |
| Source binding and namespace closure | Private source issuers and original module/derive resolution | Remove unresolved common binding and producer prerequisites without bypassing owner/type/effect checks. |
| Forward translation | Partial actual Rust application translation | Complete caller lowering, types, async control, mutation and generated JS/TS packaging for the entire production source set. |
| Reverse translation | Portable scalar and owned-core subsets | Complete the corresponding JS/TS source constructs, owned operation mappings and Rust/TS emission. |
| Synchronization | Source-capturing synchronizer and guarded generated assets | Complete change direction, conflict handling and fresh canonical, profile, owned and reverse output production. |
| Native Router parity | Operations, storage, routing, protocols, authorization and server subsets | Implement all remaining feature and route gaps; keep truthful manifest statuses until independent evidence exists. |
| Independent coverage | Shared JS/TS cases and Rust oracle source | Draft boundary, error, ownership, ordering, cancellation and streaming cases for every new operation and actual callers; execute none during drafting. |
| CI repairs | Collected whole published cycle; selected local repairs | Draft the remaining source-history, native parser, timing, profile freshness, reverse freshness and strict parity repairs without changing workloads or deadlines. |
| JavaScript-first CI | All required same-SHA JS stages gate fatal Rust jobs | Preserve all eight stages, complete matrix membership, original commands and deadlines; no Rust bypass or swallowed failures. |
| Reusable delivery | Exported compiler, source provenance and adoption tooling | Include every new runtime/rule/source dependency, notices and receiving instructions; no qualification claim from an export alone. |
| Resource and publication discipline | Single publisher; coordinator works alone | Continue alone, avoid extra dependency trees, commit without execution hooks, push source checkpoints every few hours, and defer CI inspection/repairs until drafting is complete. |

Complete source-family records and their open limitations are retained in
[history part one](bulk-draft-source-history-1.md) and
[history part two](bulk-draft-source-history-2.md) and
[history part three](bulk-draft-source-history-3.md) and
[history part four](bulk-draft-source-history-4.md). These records were split
without removing their source obligations or verification limitations.

The latest source-only checkpoints cover original documentation expressions,
shared ASCII/split operations and adoption, actual x86 metadata, private attribute
invocation inputs, conditional literal concat, the original architecture document
asset and native include-str premises, and the exact document substitution. All
new implementation and case source remains unrun. Actual macro/attribute owner,
source-callsite/Span, visitor, global export and type-prefix closure, wider
language/production parity, reverse/synchronization/freshness/CI repairs and
receiving qualification remain unfinished. Every requirement in the table stays
open; no current completion percentage or newly executable coverage is claimed.

The [macro file-token source draft](macro-file-token-context-draft.md) copies four
complete original issuer paths into a distinct macro identifier domain, retaining
fifteen current native inputs and 102 constructor programs. Three compiler
equations and independent unrun source/private/refusal cases are drafted. Actual
Span/resolver/macro-owner authority and all unfinished requirements remain open.

The [architecture document/file-token draft](architecture-doc-file-token-draft.md)
copies the full substitution path into an additive async entry, joins the exact
ordinary macro token constructor equation and rechecks original inputs after
every await. Three compiler equations and independent unrun source/refusal cases
are drafted. Actual Span/resolver/owner/global qualification and every unfinished
requirement remain open.

The [attribute header source draft](attribute-header-source-draft.md) copies the
complete private source capture pattern and directly parses actual path and
empty/delimited/equality arguments on root/inner/member headers. Three compiler
equations and independent unrun source/path/private/refusal cases are drafted.
Native builtin consumers, actual ownership/global closure and all unfinished
requirements remain open.

The [header source operation draft](attribute-header-operation-draft.md) reuses
one already checked physical CST per synchronous operation while preserving
current private source/AST and native guards. Four compiler equations and
independent unrun source/restoration/native-change/refusal cases are drafted.
No measured performance or owner/parity result is claimed; all unfinished
requirements remain open.

The [parsed builtin caller draft](parsed-builtin-callers-draft.md) joins genuine
header receipts to all fifteen original grammars and native registrations under
an explicit restoring operation, with narrow private outer-name receipts and
complete project integration. Four compiler equations and independent unrun
source/private/JS/strict TS/native namespace cases are drafted. Caller presence,
argument/global/runtime semantics and every unfinished requirement remain open.

The [parsed native source operation draft](parsed-native-source-operation-draft.md)
copies the complete native source reader for bounded within-operation sharing
across four separate premise domains, retaining fresh current checks, nested
invalidation and the original combined input bound. Two compiler equations and
independent unrun source/lifecycle/refusal cases are drafted. No performance,
owner/parity/coverage or completion result is claimed; all requirements stay open.

The [parsed metadata builtin draft](parsed-metadata-builtins-draft.md) copies
complete inner lint, module macro_use and documentation consumers, joining
genuine original headers to separate native premise domains. Three compiler
equations and independent unrun source/private/JS/strict TS/native cases are
drafted. Only conditional builtin-name lookup is selected; caller ownership,
argument/global/runtime semantics and every unfinished requirement remain open.

The [scalar character pattern draft](text-character-pattern-adoption-draft.md)
copies the complete text selector and proposer to cover ten method shapes using
the existing paired helpers. Literal conversion runs in language rules and
qualified calls in repository rules, with rebased spans and full inverses.
Three compiler equations and independent unrun JS/strict TS/native/refusal
cases are drafted. Actual production adoption, source-bank/export freshness,
semantic/parity/coverage qualification and every requirement remain unfinished.

The [owned text receiver draft](text-owned-receiver-adoption-draft.md) copies the
complete selector for immutable written String parameters and exact as_str
borrow bridges through existing paired helpers. Two compiler equations and
independent unrun source/JS/strict TS/native/refusal cases are drafted. No custom
owner, dispatch/Drop, production coverage, parity or completion result is claimed;
all remaining requirement and verification obligations remain open.

The [function nested attribute draft](function-nested-attributes-draft.md) copies
the complete header issuer/reader for attributes on actual ordinary/method and
lifetime/type/const generic parameters under a genuine complete function frame.
Three compiler equations and independent unrun source/private/refusal cases are
drafted. Field/variant attributes, native nested builtin consumers, owner/effect
closure and all production/reverse/synchronization/CI/receiving work remain open.

The [whole data item draft](original-data-items-draft.md) composes the existing
private grammar for named/tuple/unit structs and enums, with separate genuine
data receipts and header consumers at generic, field, variant and variant-field
sites. Three compiler equations and independent unrun syntax/private/refusal and
native oracle cases are drafted. Native legality, builtin/derive/owner/effect
closure, lowering and every remaining production/reverse/CI requirement stay open.

The [borrowed text fallback draft](text-option-fallbacks-draft.md) adds twelve
paired native/JS/TS operations, shared forward/reverse registrations and exact
source fallback fusion under the existing root-zero borrow and scalar bounds.
Eleven compiler equations, complete adjacent native histories and independent
unrun vectors/JS/strict TS/reverse/native/refusal cases are drafted. Production
adoption, full parity, source-bank/export freshness, synchronization and all
remaining source and verification requirements remain unfinished.

The [normal ungated registry draft](normal-ungated-registry-draft.md) copies full
native catalogue/constructor/lookup readers to discover ordinary ungated entries
from the actual complete array in one inspection. Four compiler equations and
independent unrun source/refusal cases are drafted. Unsafe/gated/internal entries,
actual new parsed callers, attribute behavior/effects and every remaining source,
translation, parity, synchronization, CI and receiving requirement stay open.

The [normal ungated caller draft](normal-ungated-callers-draft.md) joins actual
private item/function/data header families to discovered ordinary native names,
with private fresh receipts and one bounded within-operation native frame.
Three compiler equations and independent unrun source/private/refusal cases are
drafted. Actual native-parsed caller presence, behavior/effect consumers, all
owner/global closure and every unfinished delivery requirement remain open.

The [shared header expression draft](header-expression-draft.md) reuses actual
equality ASTs from genuine item/function/data headers and copies seven complete
private macro position/input/capture paths with original tree identity. Three
compiler equations and independent unrun source/private/refusal cases are
drafted. Actual owner/visitor/global qualification, adapted value consumers and
every remaining production/reverse/sync/freshness/CI requirement stay unfinished.

The [shared header value consumer draft](header-value-consumers-draft.md) copies
the complete concat and exact architecture include-str proposals, including the
async file-token join, for genuine item/function/data header expression receipts.
Three compiler equations and independent unrun source/native-closure/refusal
cases are drafted. Owner/effect/Span bridges, whole-source/application parity and
all remaining production/reverse/sync/freshness/CI requirements stay unfinished.

The [expression block scope draft](expression-block-scopes-draft.md) retains
thirteen native inputs, forty full callbacks and seven receiver containers and
models Item/MacCall child block modules from genuine header expressions. Four
compiler equations and independent unrun source/private/native/refusal cases
are drafted. Actual native receiver/module/visitor mapping, type isolation,
global closure and all remaining translation/delivery requirements remain open.

The [owned text copy draft](text-owned-copy-draft.md) adds one paired owned
contract and common text to_owned/to_string/owned clone adoption, with actual
literal receivers and shared forward/reverse mappings. Twelve compiler equations,
full adjacent native histories and independent unrun JS/strict TS/reverse/native/
refusal cases are drafted. Production adoption, original equivalence/parity,
source-bank/export freshness and all remaining delivery requirements stay open.

The [JSON clone chain draft](json-clone-chains-draft.md) extends the complete copy
selector through bounded shared readers and optional cloned calls, with an
explicit language Option equation followed by repository-owned path bindings.
Four compiler equations and independent unrun source/JS/strict TS/native/refusal
cases are drafted. Original equivalence, actual production gains, freshness,
parity, reverse synchronization and every remaining delivery requirement stay open.

The [JSON reader domain draft](json-reader-domains-draft.md) covers nine existing
read-only JSON contracts, written lifetimes, standard Option signatures and
composed object/array try/read chains in both actual proposal entry points.
Three compiler equations and independent unrun source/JS/strict TS/native cases
are drafted. Native equivalence, caller qualification, freshness, parity, reverse
synchronization and every remaining delivery requirement remain unfinished.

The [block local item draft](block-local-items-draft.md) composes original data,
type/const/static/extern-crate and visible use syntax inside positive blocks,
retaining a source model and four further whole native macro-use/crate callbacks.
Five compiler equations and independent unrun source/native cases are drafted.
Actual native AST/visitor/scope/owner/global closure, production translation and
every remaining source and verification requirement remain unfinished.

The [JSON reader default draft](json-reader-defaults-draft.md) composes six known
scalar unwrap_or_default forms with explicit language branches, repository-owned
constructors, rebased generated paths and complete staged inverses. Four compiler
equations and independent unrun JS/strict TS/native/refusal sources are drafted.
Default/Drop equivalence, caller admission, freshness, parity, synchronization
and every remaining delivery requirement remain unfinished.

The [immutable JSON reader alias draft](json-reader-aliases-draft.md) adds bounded
lexical environments, delayed immutable bindings, parent restoration and exact
source origins to both existing reader proposal entry points. Three compiler
equations and independent unrun source/JS/strict TS/native cases are drafted.
Native equivalence, broader mutation/alias forms, production qualification and
every remaining source and delivery requirement remain unfinished.

The [reverse JSON reader domain draft](reverse-json-reader-domains-draft.md) adds
five existing read-only operations and matching optional payload/native/TS types
to the source-bound reverse table, retaining scalar values and borrowed roots.
Two compiler equations and independent unrun JS/strict TS/interpreter/native
cases are drafted. Actual whole callers, source banks/exports, full reverse/sync/
parity and every remaining source and verification requirement remain unfinished.

The [JSON alias annotation correction](json-alias-binding-patterns-draft.md)
separates actual immutable let binders from their written type paths, preserving
the original source-role and canonical-owner checks. Two compiler equations and
independent unrun qualified/import/conflict/refusal cases are drafted. All
broader translation, namespace, parity and delivery requirements remain open.

The [JSON reader span join draft](json-reader-span-joins-draft.md) removes
per-edit full mapping filters and repeated inverse string reconstruction,
retaining every exact check, staged CST boundary and complete source inverse.
Two compiler equations and independent unrun bulk/empty-stage cases are drafted.
No performance, deadline or completion qualification is claimed; every remaining
source, translation, parity and delivery obligation stays open.

The [qualified block draft](const-async-blocks-draft.md) distinguishes original
const items from const/async/async-move expressions, retaining array/tail source,
opaque roles and recursive scope obligations. Two compiler equations and
independent unrun source/native cases are drafted. Actual evaluation/lowering,
native namespace qualification and every remaining delivery requirement stay open.

The [shared reverse JSON type draft](reverse-json-type-witnesses-draft.md) derives
optional result witnesses from the common catalogue in seven actual emitters,
preserving each independent source/input/ownership boundary. Nine compiler
equations and independent unrun receiving/strict TS/runtime cases are drafted.
No timing, receiving, full translation or parity qualification is claimed; all
remaining source and delivery requirements remain unfinished.

The [immutable optional JSON reader draft](optional-json-readers-draft.md)
extends the original full-validator boundary to nine concrete readers, matching
scalar/borrow roots and parameter declaration witnesses in seven reverse paths.
Eighteen compiler/library equations and independent unrun JS/strict TS/private/
native cases are drafted. No original equivalence, caller, receiving, freshness,
parity or completion qualification is claimed; all remaining requirements stay open.

The [shared optional catalogue draft](optional-json-catalogue-draft.md) derives
opaque reader records from the finite direct catalogue, preserving exact member,
type and root data without another copied type list. Two compiler equations and
independent unrun contract/refusal/inverse cases are drafted. Actual exports,
caller qualification, freshness, parity and every delivery obligation stay open.

The [conditional pattern draft](condition-patterns-draft.md) adds direct if/while
let and conjunction syntax in one bounded positive parse, preserving original
patterns, scrutinees and recursive block obligations. Two compiler equations and
independent unrun source/refusal/native cases are drafted. Actual bindings,
native ownership/effects, target lowering and every delivery obligation stay open.

The [optional JSON terminal draft](json-option-terminals-draft.md) composes closed
field/reader callbacks, eager fallbacks and presence checks in the shared source
selector, with complete staged CST and inverse mappings. Three compiler equations
and independent unrun source/JS/strict TS/native cases are drafted. Actual caller,
native closure, reverse/sync, freshness, parity and all delivery work stay open.

The [JSON predicate draft](json-predicates-draft.md) shares nine kind/number names,
adds eight reverse ABI records across seven existing checked paths, and drafts
closed optional-predicate equations. Five compiler equations and independent
unrun forward/strict TS/seven-receiver/native cases are present. Production,
native closure, synchronization, freshness, parity and all delivery work stay open.

The [JSON collection-chain draft](json-collection-chains-draft.md) walks direct
collection readers, closed map/array field callbacks and JSON filters, and retains
their immutable alias roles and existing lazy-error implementation. Four compiler
equations and independent unrun JS/strict TS/native cases are drafted. Actual
callers, native closure, broader effects, reverse/sync and all delivery work stay open.

The [positive character draft](positive-characters-draft.md) distinguishes masked
character tokens from strings and validates Unicode scalar expressions/patterns
under the existing primitive guards. Two compiler equations and independent
unrun source/refusal/native cases are drafted. Original native/type/owner closure,
production translation, synchronization, parity and all delivery work stay open.

The [shared JSON selector draft](shared-json-selector-draft.md) joins ordinary and
source-bound bulk adopters to one current candidate implementation, preserving
each outer guard/proof context and adding explicit synchronization facade APIs.
Five compiler equations and independent unrun bulk/packet/guard/source cases are
drafted. Export production, receiving, native closure and all delivery work stay open.

The [positive pattern draft](positive-patterns-draft.md) adds shared range,
slice/rest, at-binding, alternative and field syntax under the existing private
parser bounds. Two compiler equations and independent unrun syntax/refusal/native
boundary cases are drafted. Native/type/binding closure, target semantics,
whole production translation, parity and all delivery obligations stay open.

The [primitive bitwise draft](primitive-bitwise-draft.md) adds checked eager bool/
fixed-integer operations and scalar compound assignments through original tokens,
Host meta, target/runtime declarations and bounded const evaluation. Nine compiler
equations and independent unrun JS/strict TS/native cases are drafted. Reverse
helper recognition, actual callers, native closure and every delivery task stay open.

The [boolean bitwise reverse draft](reverse-boolean-bitwise-draft.md) adds an
explicit current-source helper context across seven checked reverse paths,
preserving default contexts and paired target/interpreter order. Eighteen source
equations and independent unrun receiving/strict TS/refusal cases are drafted.
Fixed-width reverse typing, production, native closure and all delivery work stay open.

The [shared primitive declaration draft](primitive-declarations-draft.md) joins
both forward asset factories and reverse contexts to one bounded physical ABI
source. Three compiler equations and independent unrun source-reader/ABI cases
are drafted. Receiving, fixed-width reverse typing, source banks/exports,
production/native closure, synchronization, parity and all delivery work stay open.

The [fixed-width bitwise reverse draft](reverse-fixed-bitwise-draft.md) adds ten
explicit imported native scalar ABIs, checked helper metadata and bounded decimal
literals across seven reverse paths. Eighteen compiler/library equations and
independent unrun receiving/strict TS/interpreter cases are drafted. Forward type
projection, native closure, production, parity and all delivery work stay open.

The [positive generic draft](positive-generics-draft.md) adds free/associated
turbofish and bounded const argument/default parsing without consuming enclosing
angle tokens. Two compiler equations and independent unrun source/refusal/native
cases are drafted. Native const/type/owner closure, actual target semantics,
whole production translation, parity and all delivery obligations stay open.

The [native scalar TS projection draft](forward-native-scalars-draft.md) carries
already checked native integer identities through the actual standalone/project
forward annotations and all seven reverse static import-type paths. Twelve
whole source equations and independent unrun layout/strict TS/meta/receiving
cases are drafted. Complete generated module recognition, all remaining source,
native closure, synchronization, freshness, parity and delivery remain open.

The [shared reverse primitive draft](reverse-primitive-operators-draft.md) uses
one bitwise/cast/shift recognizer and one cast/shift emission/evaluation helper
across all seven profiles. Seventeen complete source equations, unrun matrix,
meta/CST/strict TS/refusal/order cases and native oracle source are drafted.
All complete module/inverse, production, native closure, synchronization,
freshness, parity, remaining source and delivery obligations stay open.

The [canonical primitive Rust inverse draft](primitive-rust-inverse-draft.md)
projects the scalar families through state/outcome/cancellation Rust observations
and their actual private JavaScript/meta/reproduction paths. Ten complete source
equations and independent unrun matrix/boolean/meta/inverse/refusal cases are
drafted. Arbitrary/complete forward modules and every remaining production,
native closure, synchronization, freshness, parity and delivery obligation stay open.

The [positive scoped-item draft](positive-scoped-items-draft.md) retains complete
nested module/trait/impl/foreign bodies, members, associated declarations,
attributes and original macro positions under the private positive grammar.
Two complete source equations, unrun source/refusal cases and a CI-only native
oracle are drafted. All actual native owner/effect/global closure, remaining
source, production, reverse/sync/freshness, parity and delivery stay unfinished.

The [qualified type/path draft](positive-qualified-types-draft.md) retains
qualified associated paths, higher-ranked lifetimes, Fn arguments, ABI function
pointers and associated bounds in the private positive grammar. Two complete
source equations and independent unrun source/refusal/native oracle cases are
drafted. Actual native/type/owner/global/effect closure and all remaining source,
production, reverse/sync/freshness, parity and delivery obligations remain open.

The [primitive source-unit integration draft](primitive-unit-integration-draft.md)
connects explicit primitive contexts to actual state/outcome/cancellation units,
paired JS signatures, mirrored runtimes and all three transaction paths. Shared
native relocation retains literal/type/JSDoc edges and complete inverses. Fourteen
whole source equations and unrun unit/strict TS/receiving/export/refusal cases are
drafted. All remaining source/native/production/sync/freshness/parity/delivery
obligations stay open.

The [primitive multi-module unit draft](primitive-project-integration-draft.md)
extends explicit primitive contexts through the owned-project graph, paired
project signatures, scalar JSDoc redistribution and actual complete receiving
rechecks. Seven whole source equations and unrun module/local-call/three-language/
strict TS/refusal cases are drafted. Public native scalar export aliases and all
remaining source/native/production/sync/freshness/parity/delivery work stay open.

The [packaged primitive module inverse draft](primitive-module-inverse-draft.md)
propagates explicit primitive parsing/projecting through both complete module
Rust inverse copies, including multi-module scalar restoration. Three complete
source equations and unrun width/envelope/meta/batch/refusal/native oracle cases
are drafted. Public native scalar exports and every remaining source/native/
production/sync/freshness/parity/delivery obligation remain open.

The [closed import alias draft](closed-import-aliases-draft.md) preserves closed
static import type leaves through actual local/generic alias substitution and
shares bounded transparent type parentheses across all seven receiving paths.
Ten complete source equations and unrun native-domain/alias/meta/refusal/depth
cases are drafted. Public native scalar exports and all remaining source/native/
production/sync/freshness/parity/delivery obligations remain unfinished.

The [primitive declaration mirror draft](primitive-declaration-mirrors-draft.md)
joins actual native alias symbols to the canonical declaration or a complete
byte-equal runtime mirror for named and inline imports in every receiving path.
Nine complete source equations and unrun symbol/meta/runtime/changed-mirror
refusals are drafted. Public native exports and all remaining source/native/
production/sync/freshness/parity/delivery obligations remain unfinished.

The [public native alias source draft](public-native-alias-source-draft.md)
rebuilds fresh receiving native symbols for direct/chained scalar alias DATA and
proposes complete target-coordinate type source with full CST/inverses. Two
whole source equations and unrun symbol/source/refusal cases are drafted. Public
packaging/root-interface/redistribution consumers and all remaining source/native/
production/sync/freshness/parity/delivery obligations remain unfinished.

The [public native alias packaging draft](public-native-alias-integration-draft.md)
connects actual native scalar alias symbols to Rust/TS public packaging,
canonical root interfaces, empty-body inverses and complete receiving module
redistribution. Eight whole source equations and unrun width/restoration/strict
TS/type-only/refusal/native oracle cases are drafted. Generic/optional native
public aliases and every remaining source/native/production/sync/freshness/
parity/delivery obligation remain unfinished.

The [generic native alias draft](generic-native-aliases-draft.md) resolves actual
parameter symbols, nested applications and ordered defaults, batches native
bigint constraint arguments into one fresh complete source proposal, and limits
legacy target helpers to their actual remaining closure. Six whole compiler
source equations and unrun width/body/public-restoration/strict TS/refusal/native
oracle cases are drafted. Optional native aliases and all remaining source/
native/production/sync/freshness/parity/delivery obligations stay unfinished.

The [native scalar flow draft](native-scalar-flow-draft.md) shares bounded
native literal joins and exact comparisons across seven reverse profiles,
extends the three existing mutable-local profiles to root-free native Copy
scalars, and fixes vector comparison dispatch. Ten complete source equations and
unrun all-width/profile/comparison/mutation/restoration/refusal/native oracle
cases are drafted. Every remaining source/native/production/sync/freshness/
parity/delivery obligation remains unfinished.

The [forward primitive body draft](forward-primitive-body-draft.md) connects actual
original cast/shift/bitwise imports to the existing complete-project body
synchronizer, retaining fresh runtime source/CST, full native rechecking, census
and entire requested target reproduction. Four whole source equations and unrun
JS/TS ten-width cast/count, eager bool, strict TS/refusal/native oracle sources
are drafted. Broader generated modules and all remaining source/native/
production/sync/freshness/parity/delivery obligations remain unfinished.

The [physical primitive project draft](forward-primitive-project-draft.md)
composes the actual helper inverse with Git-aware rust/src/js/src/ts/src source
transactions and extends runtime relocation to native JSDoc queries/import tags.
Two compiler source equations and unrun width/strict-consumer/mirror/composite/
concurrency/tamper/staleness/source-refusal cases are drafted. All remaining
source/native/production/sync/freshness/parity/delivery requirements stay open.

The [native complement draft](native-complement-draft.md) carries actual fixed
integer negation of bits through forward checked meta, constant evaluation,
shared runtime, all seven reverse source/emit/interpreter paths, canonical Rust
inverses and whole-project synchronization. Seventeen source equations and unrun
width/ordering/constant/meta/strict TS/inverse/sync/refusal/native oracle cases
are drafted. All remaining source/native/production/sync/freshness/parity/delivery
requirements remain unfinished.

The [ordinary native bitwise draft](native-bitwise-expressions-draft.md) lowers
actual source-bound fixed BigInt expressions in seven private checkers and
compound assignments in three existing mutable profiles, without forging host
imports. Sixteen compiler equations and unrun width/profile/boundary/alias/
public-module/inverse/refusal/tamper sources are drafted. Native caller/global
closure and all remaining source/production/sync/freshness/parity/delivery
requirements remain unfinished.

The [native copy/comparison draft](native-scalar-copy-comparisons-draft.md)
qualifies actual fixed-domain standalone copies, conditional returns and exact
comparisons in seven source checkers while retaining all whole-function and
native ABI guards. Eighteen complete equations and unrun width/profile/order/
copy/inverse/refusal/tamper cases are drafted. Every remaining source/native/
production/sync/freshness/parity/delivery requirement remains unfinished.

The [shared native integer method draft](native-integer-methods-draft.md) copies
the existing fixed runtime and composes eight native value methods across ten
widths through forward presentation, seven reverse profiles, qualified Rust
inverses and whole-project synchronization. Eighteen whole source equations and
unrun boundary/strict TS/meta/sync/inverse/legacy/refusal/native oracle cases are
drafted. All remaining native owner/global closure, source/production/sync/
freshness/parity/delivery requirements remain unfinished.

The [fresh wrapping source draft](fixed-wrapping-operation-draft.md) removes
cross-operation raw/token/item/proof caches and groups current pinned native
inputs inside bounded synchronous compiler operations. Six complete equations
and unrun independent receiving archive/license/manifest mutation, decoded
metadata, private identity, nesting/invalidation, cleanup and refusal sources
are drafted. Every remaining source/native/production/sync/freshness/parity/
delivery obligation remains unfinished.

The [source-bound wrapping constant draft](constant-wrapping-draft.md) adds exact
fixed wrapping add/sub evaluation through the actual pinned member/intrinsic
and original bounded evaluator. Two complete equations and unrun ten-domain
constant/JS/strict TS/meta/source/private/budget/refusal/native oracle cases are
drafted. All remaining source/native/production/sync/freshness/parity/delivery
requirements remain unfinished.

The [shared checked arithmetic draft](native-integer-arithmetic-draft.md) routes
five actual fixed operations across ten widths through forward/meta/runtime,
seven reverse source/emit/interpreter paths, qualified checked Rust inverses and
complete project synchronization. Eighteen whole equations and unrun boundary/
exact-error/order/strict TS/meta/inverse/sync/refusal/native oracle sources are
drafted. Every remaining source/native/production/sync/freshness/parity/delivery
requirement remains unfinished.

The [shared checked signed negation draft](native-integer-negation-draft.md)
extends the existing arithmetic carrier across five signed widths, forward/meta,
seven reverse profiles, exact checked Rust inverses and full-project sync. Ten
whole equations and unrun boundary/exact-error/order/strict TS/inverse/source/
refusal/native oracle cases are drafted. Every remaining source/native/
production/sync/freshness/parity/delivery requirement remains unfinished.

The [guarded async comparison draft](async-control-comparisons-draft.md) adds
six source-guarded u64 comparisons and strict Boolean equality inside existing
cold resource branches and canonical Rust inverses. Three whole equations and
unrun truth-table/order/strict TS/cold cancellation/deadline/source/meta/inverse/
refusal/native oracle sources are drafted. Every remaining source/native/
production/sync/freshness/parity/delivery requirement remains unfinished.

The wrapping operation error-exit successor retains original source-read and
callback failures while still executing every final freshness fence and cleanup.
Two complete equations and unrun receiving simultaneous-error/nested-poisoning/
null-throw/source-history cases are drafted. Every remaining source/native/
production/sync/freshness/parity/delivery requirement remains unfinished.

The [async terminal guard draft](async-control-guards-draft.md) adds checked
remaining-tail continuations, single return branches and terminal else-if chains
under the original resource/domain/cell/depth rules. Two complete equations and
unrun truth-table/cleanup/cold cancellation/strict TS/meta/source/inverse/
refusal/native oracle sources are drafted. Every remaining source/native/
production/sync/freshness/parity/delivery requirement remains unfinished.

The async u64 literal resource successor replaces unbounded pre-range BigInt
conversion with bounded exact decimal selection. Two complete equations and
unrun native-AST/host-conversion-observer/strict TS/boundary/refusal source cases
are drafted. Every remaining source/native/production/sync/freshness/parity/
delivery requirement remains unfinished.

The [authoritative native guard draft](async-native-guards-draft.md) retains
actual Rust guard/return form through full receiving JS/meta checks and unchanged
complete native token reproduction. Four whole equations and unrun original
Rust/Boolean/u64/cold cancellation/strict TS/meta/inverse/refusal/native oracle
sources are drafted. Broader native printer/control forms and every remaining
source/native/production/sync/freshness/parity/delivery requirement stay open.

The [base64 local/borrowed-value draft](base64-local-values-draft.md) shares
concrete operand selection and an immutable-local census across both existing
adopters and the fixed bulk stage, with actual language then repository source
substitutions. Four complete equations and unrun source/comment/Unicode/shadow/
namespace/bulk/fresh-project/strict TS/native oracle cases are drafted. Legacy
trait closure and every remaining source/native/production/sync/freshness/
parity/delivery requirement stay open.

The [chronological base64 alias draft](base64-local-aliases-draft.md) follows
actual immutable argument/borrowed-view aliases and direct selected encode
results within declaration order and lexical scope in both existing adopters.
Four whole equations and unrun source-span/timing/scope/roundtrip/bulk/fresh-
project/strict TS/refusal/native oracle cases are drafted. Original trait/global
closure and every remaining source/native/production/sync/freshness/parity/
delivery requirement stay open.

The [chronological integer alias draft](integer-local-aliases-draft.md) copies
the complete alias engine for native primitive DATA, closed suffixed literals
and actual selected primitive results in both existing integer adopters. Five
whole equations and unrun scope/timing/span/boundary/bulk/fresh-project/strict TS/
refusal/native oracle sources are drafted. Both source substitution phases are
active; complete source/native/production/sync/freshness/parity/delivery
requirements remain unfinished.

The [shared chronological source draft](chronological-local-source-draft.md)
consolidates the complete alias engine while preserving separate base64/integer
operand, census and result rules. Four whole equations and unrun invocation/
family-isolation/timing/source-history cases are drafted. Complete source/native/
production/sync/freshness/parity/delivery obligations remain unfinished.

The [text scope/index draft](text-local-index-draft.md) applies the shared
chronological selector to text aliases/results and exact optional UTF-8 byte
index projections in both existing adopters, preserving both source phases in
the fixed bulk stage. Four whole equations and unrun Unicode/empty-pattern/
scope/source/CST/strict TS/native oracle cases are drafted. Every wider source/
native/production/sync/freshness/parity/delivery requirement remains unfinished.

The [shared carrier local draft](carrier-local-source-draft.md) extends the
chronological engine across three Option/Result method/callback selectors and
all six corresponding ordinary/source-bound APIs. Seven whole equations and unrun
constructor/domain/scope/capture/bulk/receiving JS/strict TS/native-oracle cases
are drafted. Every wider source/native/production/sync/freshness/parity/delivery
requirement remains unfinished.

The [shared layered core draft](layered-core-adoption-draft.md) copies one
complete source/CST/inverse algorithm across eight integer/Option/Result
adapters, with actual neutral language calls then exact repository prefix
substitutions. Ten whole equations and unrun nesting/Unicode/literal/trivia/
source-refusal cases are drafted. All wider source/native/production/sync/
freshness/parity/delivery requirements remain unfinished.

Independent shared-adoption export/receiving source now covers complete helper/
original/recipe inclusion and five actual public bulk stages in an isolated
compiler tree. Reusable guidance describes the same bounded source/rule pattern.
Every receiving, target, native, freshness and full-delivery result remains
unrun/unverified; the complete requirement set remains unfinished.

The [shared scalar/call source draft](layered-literal-adoption-draft.md) copies
text's full scalar rebasing into the common planner and connects both text and
base64 APIs, for twelve actual adapters. Six whole equations and unrun Unicode/
scalar/order/CST/inverse/refusal cases are drafted. All wider source/native/
production/sync/freshness/parity/delivery requirements remain unfinished.

The [owned Result local draft](owned-result-local-source-draft.md) reuses the
shared carrier and layered source engines in both owned String Result adapters.
Five whole equations and unrun constructor/scope/capture/Unicode/bulk/receiving
JS/strict TS/native-oracle cases are drafted. All wider source/native/production/
sync/freshness/parity/delivery requirements remain unfinished.

The [owned JSON local draft](owned-json-local-source-draft.md) reuses the
chronological and layered source engines in both existing JSON carrier adopters,
retaining their single-use/default/shared-receiver rules. Five whole equations
and unrun scope/chain/Unicode/bulk/receiving JS/strict TS/native-oracle cases are
drafted. All wider source/native/production/sync/freshness/parity/delivery
requirements remain unfinished.

The [native text count draft](text-count-local-source-draft.md) reuses the shared
text source engine for actual usize parameter/local/length count DATA and
once-only native core casts. Three whole equations and unrun bounds/annotation/
scope/UTF-8/bulk/receiving JS/strict TS/native-oracle cases are drafted. Wider
count forms and all source/native/production/sync/freshness/parity/delivery
requirements remain unfinished.

The [JSON field local draft](json-field-local-source-draft.md) reuses shared
chronological and layered rules for receiver/text/owned-view/usize key aliases
in both field adapters. Five whole equations and unrun shadow/scope/lookup/
Unicode/bulk/receiving JS/strict TS/native-oracle cases are drafted. All wider
source/native/production/sync/freshness/parity/delivery requirements stay open.

The [shared JSON slice/vector draft](json-slice-local-source-draft.md) copies the
whole collection selector once and reuses chronological/layered rules across
four existing map/iteration adapters. Eight whole equations and unrun scope/
callback/order/Unicode/bulk/receiving JS/strict TS/native-oracle cases are drafted.
All wider source/native/production/sync/freshness/parity/delivery requirements
remain unfinished.

The [shared declaration draft](local-alias-binding-source-draft.md) copies one
bounded census across families and masks unrelated mutable locals as unknown
without discarding independent immutable aliases. Fourteen whole equations and
unrun seven-tracker/source/caller/JS/strict TS/native-oracle cases are drafted.
All broader source/native/production/sync/freshness/parity/delivery requirements
remain unfinished.

The [JSON loop alias draft](json-loop-alias-source-draft.md) reuses shared
chronological slice/vector facts and genuine layered source substitutions in
both existing closed fold-loop adapters. Four complete equations and unrun
prefix/vector/consuming-refusal/order/empty/Unicode/bulk/receiving JS/strict TS/
native-oracle cases are drafted. All wider source/native/production/sync/
freshness/parity/delivery requirements remain unfinished.

The [written immutable local draft](written-local-alias-source-draft.md) shares
bounded declaration and matching-initializer rules across seven families and
closed loop prefixes. Eleven complete equations and unrun domain/mismatch/scope/
scalar-boundary/bulk/receiving JS/strict TS/export/native-oracle source is drafted.
All wider source/native/production/sync/freshness/parity/delivery requirements
remain unfinished.

The [ordinary for alias draft](for-alias-scope-source-draft.md) shares complete
plain/wildcard pattern census rules across seven families and actual selectors,
retaining unknown iterator values and all shadow/ownership/native gates.
Eighteen complete equations and independent unrun scope/pattern/bulk/JS/strict
TS/export/native-oracle source is drafted. All wider source/native/production/
sync/freshness/parity/delivery requirements remain unfinished.

The [explicit Git sync baseline draft](explicit-sync-baseline-source-draft.md)
shares immutable local-ancestor selection across both complete unit APIs and
the forward-project API, retaining complete source retranslation and all
conflict/apply guards. Five complete equations and unrun committed JS/TS/Rust/
concurrency/deletion/stale/replacement-ref/JS/strict TS cases are drafted. Every
wider source/native/production/sync/freshness/parity/delivery requirement stays open.

The [written carrier initializer draft](carrier-written-initializer-source-draft.md)
replaces four duplicated typed initializer scans with the shared bounded source
reader, retaining actual selected-result facts and all original checks. Six
complete equations and unrun eight-API/four-bulk-stage/JS/strict TS/export/native
oracle source is drafted. All wider source/native/production/sync/freshness/
parity/delivery requirements remain unfinished.

The [physical inverse-layout draft](inverse-rust-layout-source-draft.md) shares
one guard-only path label across five canonical inverse APIs while retaining
actual physical source paths and all original native/source/semantic checks.
Seven complete equations and unrun five-API/path/refusal/receiving JS/strict TS
source is drafted. All wider source/native/production/sync/freshness/parity/
delivery requirements remain unfinished.

The [primitive initializer expression draft](primitive-local-expression-source-draft.md)
adds bounded matching-native-domain expression DATA to the existing integer
alias lane while preserving complete initializer bytes and all original checks.
Four complete equations and unrun grammar/bounds/scope/two-API/bulk/JS/strict TS/
export/native oracle source is drafted. Every wider source/native/production/
sync/freshness/parity/delivery requirement remains unfinished.

The [qualified integer source draft](qualified-integer-source-draft.md) shares
existing written native domains across integer parameters and static bound
operands, preserving actual spelling/trivia and all original semantic checks.
Four complete equations and unrun domain/path/span/two-API/bulk/JS/strict TS/
export/native oracle source is drafted. All wider source/native/production/
sync/freshness/parity/delivery requirements remain unfinished.

The [automated scalar integer width draft](integer-width-source-draft.md) copies
76 real scalar operations from complete existing native/runtime templates,
retains all original30 APIs, and drafts matching declarations, all ten forward
widths and guarded reverse paths. Ten JS/TS equations plus a full native source
descendant and unrun runtime/bulk/JS/strict TS/reverse/export/native oracle source
are drafted. Broader checked carriers and every wider source/native/production/
sync/freshness/parity/delivery requirement remain unfinished.

The [shared native integer literal draft](native-integer-literal-source-draft.md)
reuses the actual Rust decoder across seven operation stages, preserving native
widths, explicit count bounds, source spelling and original whole-function
checks. Twelve complete compiler equations and independent unrun lexical,
adopter/bulk/JS/strict TS/export/native oracle source are drafted. Every wider
source/native/production/sync/freshness/parity/delivery requirement stays open.

The [checked integer width draft](integer-checked-width-source-draft.md) copies
44 additional checked operations from complete existing templates and retains
all150 scalar/checked interfaces, native payload identity, forward/reverse
carriers and full adjacent Rust source histories. Seventeen JS/TS equations plus
native source and independent unrun caller/JS/strict TS/reverse/export/oracle
cases are drafted. Every wider source/native/production/sync/freshness/parity/
delivery requirement remains unfinished.

The [primitive Option width draft](primitive-option-width-source-draft.md) copies
72 interfaces from complete original templates, retains all106 finite interfaces
and generic identity, and joins local/inline checked arithmetic results through
fresh shared source rules. Twelve JS/TS equations, native source histories and
independent unrun runtime/four-API/consecutive-stage/JS/strict TS/reverse/export/
oracle cases are drafted. Wider callbacks/Result and every source/native/
production/sync/freshness/parity/delivery requirement remain unfinished.

The [borrowed JSON string default draft](json-string-default-source-draft.md)
copies the actual field/scalar reader into the common empty-default source form,
retaining JSON receiver borrow identity and other fallback evaluation. A reusable
bounded native Rust function-copy producer, eight JS/TS equations and independent
unrun runtime/caller/bulk/JS/strict TS/reverse/freshness/export/pointer-oracle
source are drafted. Every wider source/native/production/sync/freshness/parity/
delivery requirement remains unfinished.

The [JSON scalar default draft](json-scalar-default-source-draft.md) copies three
native field readers and reuses actual Option validators for exact eager bool/
u64/i64 fallbacks, preserving all10 field interfaces and the earlier borrowed
reader history. Eleven JS/TS equations and independent unrun runtime/caller/
bulk/JS/strict TS/reverse/history/export/native oracle source are drafted. Every
wider source/native/production/sync/freshness/parity/delivery requirement stays open.

The [nested JSON field draft](json-nested-fields-source-draft.md) copies27
interfaces at depths two through four from nine original readers/defaults,
retaining all37 current interfaces and every native predecessor history. Shared
root traversal, full private-helper source dependencies, both adopter APIs,
three reverse checkers and12 JS/TS equations are drafted with independent unrun
runtime/caller/bulk/JS/strict TS/reverse/history/export/native lifetime-oracle
source. Every wider source/native/production/sync/freshness/parity/delivery
requirement remains unfinished.

The [JSON field stage-join draft](json-field-stage-joins-source-draft.md) derives
current bounded scalar field results for later text and both Option rule
families, including immutable typed aliases. Seven complete compiler equations
and independent unrun shared-reader/six-API/consecutive-stage/JS/strict TS/
reverse/interpreter/history/export/native oracle source are drafted. Library
ABIs and whole-function authority checks remain unchanged. Wider source/native/
production/sync/freshness/parity/delivery requirements remain unfinished.

The [JSON object-view bridge draft](json-object-bridge-source-draft.md) reuses
existing field interfaces for root/nested canonical object projections and
immutable shared key-input callbacks. Two complete compiler equations plus
independent unrun two-API/bulk/JS/strict TS/consecutive-text/history/export/native
pointer/lifetime oracle source are drafted. Unknown/effectful key and map forms
remain unselected, and all wider source/native/production/sync/freshness/parity/
delivery requirements stay unfinished.

The [JSON field Try-chain draft](json-field-try-source-draft.md) reuses existing
field abstractions for pure string-key/scalar/object-view Option Try chains,
retaining the final outer question mark and refusing non-Try successors. Four
complete compiler equations plus independent unrun two-API/consecutive-stage/
JS/strict TS/reverse-control/interpreter/native pointer/effect/export source are
drafted. All wider source/native/production/sync/freshness/parity/delivery
requirements remain unfinished.

The [owned JSON receiver draft](json-owned-receiver-source-draft.md) derives
source roles from exact canonical owned inputs/copies/decodes and actual aliases,
then adds real receiver borrows through field/text substitutions. Seven complete
compiler equations plus independent unrun constructor/two-API/consecutive-stage/
JS/strict TS/reverse-scalar/interpreter/native/export source are drafted. Reverse
local borrowed views, wider constructors/carriers and all source/native/
production/sync/freshness/parity/delivery requirements remain unfinished.

The [resource JSON field draft](http-resource-json-fields-source-draft.md) binds
all37 existing field interfaces to the separate full local-loan/multi-root/scope
checker, with fresh full field library guards and both flat JSON imports. Four
complete compiler equations and independent unrun all-interface/JS/strict TS/
full-native-inverse/local-view/escape/move/mutation/counterfeit/export source are
drafted. The older restricted lanes retain their scope and every wider source/
native/production/sync/freshness/parity/delivery requirement remains unfinished.

The [owned JSON text field draft](json-owned-text-field-source-draft.md) copies8
owning String/Option<String> interfaces from actual borrowed reader templates,
retaining all45 field operations and current native histories. Eleven complete
compiler equations and independent unrun8-ABI/24-caller/two-API/bulk/JS/strict TS/
two-reverse-lane/interpreter/native lifetime/export source are drafted. Wider
mapper/trait/callback forms and every source/native/production/sync/freshness/
parity/delivery requirement remain unfinished.

The [scoped Rust Try-token draft](rust-try-token-source-draft.md) adapts the exact
shared lexer ?. token to a separate source-only Try/dot view for field and text
selectors, retaining original UTF-16 spans, lexer and authoritative CST. Four
complete compiler equations and independent unrun lexical/span/two-API/bulk/
JS/strict TS/history/export source are drafted. Every wider source/native/
production/sync/freshness/parity/delivery requirement remains unfinished.

The [filtered JSON field draft](json-filtered-field-source-draft.md) adds16 paired
borrowed/owned optional/default interfaces, two exact nonempty/nonblank predicate
modes, full original whitespace declaration provenance and retained61-interface
histories. Eight compiler equations and independent unrun ABI/two-API/40-caller/
bulk/JS/strict TS/two-reverse-lane/native storage/lifetime/export source are
drafted. Every wider source/native/production/sync/freshness/parity/delivery
requirement remains OPEN and all verification remains UNRUN.

The [owned JSON value field draft](json-owned-value-field-source-draft.md) adds15
paired copy/optional/null-default interfaces across keys, nested paths and
indices, retains76-interface histories and composes selected local receivers
within one source operation. Ten compiler equations and independent unrun ABI/
two-API/bulk/JS/strict TS/two-reverse-lane/native storage/lifetime/export source
are drafted. Every wider source/native/production/sync/freshness/parity/delivery
requirement remains OPEN and all verification remains UNRUN.

The [optional text draft](optional-text-source-draft.md) adds10 paired consuming
String/Option<String> and borrowed-filter interfaces, retains116 finite Option
APIs and composes unchanged generic identity through complete old/current
three-language source histories. Sixteen compiler equations and independent
unrun runtime/two-API/bulk/JS/strict TS/resource-reverse/native/history/export
source are drafted. Older restricted reverse lanes, wider callbacks/shared
inspection and all source/native/production/sync/freshness/parity/delivery
requirements remain OPEN; all verification remains UNRUN.

The [shared core call draft](core-carrier-call-source-draft.md) separates bounded
qualified-call language syntax from actual repository integer/text/Option operand
and result rules, feeding both original Option and text adopters and fresh local
trackers. Eight compiler equations plus independent unrun nested/source-domain/
six-API/7-caller/consecutive-stage/JS/strict TS/resource-reverse/native/export
source are drafted. No runtime ABI or semantic checker changed. Every wider
source/native/production/sync/freshness/parity/delivery requirement remains OPEN;
all verification remains UNRUN.

The [optional owning text callback draft](optional-text-callback-source-draft.md)
adds18 paired map/chain/lazy recovery interfaces, retaining54 callback contracts
and complete original native templates. Ten compiler equations and independent
unrun18-ABI/two-API/18-caller/bulk/JS/strict TS/resource-reverse/native move/storage/
export source are drafted. Captured owner transfer, older restricted reverse
lanes, wider callback lowering and all source/native/production/sync/freshness/
parity/delivery requirements remain OPEN. All verification remains UNRUN.

The [callback text-body draft](callback-text-body-source-draft.md) reuses the
existing text engine on full original callback bodies, retaining source-only
wrapper types, four complete copied helper dependencies, chronological locals,
grouped immutable borrows and child/full-parent inverses in both phases. Seven
compiler equations and independent unrun two-API/9-caller/bulk/JS/strict TS/
resource-reverse/native/export source are drafted. Every wider source/native/
production/sync/freshness/parity/delivery requirement remains OPEN; all
verification remains UNRUN.

The [Result callback text draft](result-callback-text-source-draft.md) reuses the
same full-body text adapter in primitive/owning Result success/error/recovery
rules, preserving local source roles, qualified constructor/results and child/
parent inverses. Eight compiler equations and independent unrun four-API/
13-caller/consecutive-bulk/JS/strict TS/resource-reverse/native/export source are
drafted. Every wider source/native/production/sync/freshness/parity/delivery
requirement remains OPEN and all verification remains UNRUN.

The [bounded source composition draft](core-fixed-point-source-draft.md) adds a
separate four-round streaming proposal API with fresh complete stage/source
joins, unchanged-round receipts and refusal at the cap, preserving original
one-pass APIs and CI commands. Three compiler equations and independent unrun
control/real-adopter/packet-inverse/JS/strict TS/native/export source are drafted.
Actual full-corpus performance/composition and every source/native/production/
sync/freshness/parity/delivery requirement remain OPEN; all verification is UNRUN.

The [primitive core call draft](primitive-core-call-source-draft.md) joins exact
current scalar library results to inline/local integer source rules and bounded
JSON-to-integer restaging. Four compiler equations and independent unrun two-API/
4-caller/role/refusal/fixed-point/JS/strict TS/native/export source are drafted.
Wider carrier aliases, compound/chained expressions and all source/native/
production/sync/freshness/parity/delivery requirements remain OPEN; all
verification remains UNRUN.

The [local type alias draft](local-type-alias-source-draft.md) joins bounded
ordinary alias headers to all three original import selectors, both literal
paths and local declaration/re-export walking. Six full source equations and
independent unrun source/private/refusal/JS/strict TS/native/export cases are
drafted. Alias expansion, broader namespace/architecture/owner closure and every
unfinished source/production/reverse/sync/freshness/delivery row remain OPEN.

The [primitive expression call draft](primitive-expression-call-source-draft.md)
composes qualified scalar atoms through native arithmetic, grouped integer
receivers/arguments and carrier numeric comparison/callback inference. Ten full
compiler equations and independent unrun six-API/nine-caller/JS/strict TS/paired
reverse/native/export cases are drafted. Wider expressions, namespace/production
adoption and every unfinished source/reverse/sync/freshness/parity/delivery row
remain OPEN; no verification or coverage gain is claimed.

The [fixed-point packet draft](fixed-point-packet-source-draft.md) adds complete
physical source packets, independently fresh repeated-stage readback, exact
inverse installation plans and copied guarded CLIs. Eight compiler equations and
independent unrun three-round/packet/forgery/transaction/concurrency/protocol/CLI/
export cases are drafted. Full-corpus storage/performance, generated asset and
reverse synchronization, namespace/production/freshness/parity and every
unfinished source/verification/delivery row remain OPEN.

The [boolean expression draft](boolean-expression-source-draft.md) composes
original predicates, comparisons and logical source through shared carrier and
callback inference. Three compiler equations and independent unrun six-API/
seven-caller/truth/Unicode/refusal/bounds/JS/strict TS/paired reverse/native/export
cases are drafted. Wider language and every unfinished namespace/production/
reverse/sync/freshness/parity/delivery row remain OPEN; no coverage is claimed.

The [carrier conditional draft](carrier-conditional-source-draft.md) shares
ordinary if/else/else-if source role inference across Option and both Result
callback selectors. Five complete equations and independent unrun six-API/
eight-caller/branch/owning/Unicode/refusal/JS/strict TS/paired reverse/native/export
cases are drafted. Wider control and every unfinished namespace/production/
reverse/sync/freshness/parity/delivery row remain OPEN; no coverage is claimed.

The [carrier branch-local draft](carrier-branch-local-source-draft.md) joins
immutable branch declarations and final expressions through the existing actual
chronological reader. Six compiler equations and independent unrun six-API/
seven-caller/annotation/refusal/owning/JS/strict TS/paired reverse/native/export
cases are drafted. Wider locals/control and every unfinished namespace/
production/reverse/sync/freshness/parity/delivery row remain OPEN.

The [lazy Option error draft](option-lazy-error-source-draft.md) adds five paired
lazy String-error conversions with actual Result type/source/forward/resource
mappings. Ten compiler equations, five native copies and independent unrun ABI/
callback/early-error/two-API/six-caller/JS/strict TS/paired reverse/native/export
cases are drafted. Broader domains, borrowed resource results, eager conversions,
qualified callback local joins and every unfinished namespace/production/reverse/
sync/freshness/parity/delivery row remain OPEN.

The [canonical formatting role draft](core-formatting-role-source-draft.md)
composes exact existing core format macro source through shared carrier/local/
callback roles while leaving real owner/argument/trait checks independent. Four
equations and independent unrun six-API/eight-caller/refusal/unknown-nonadmission/
JS/strict TS/native/export cases are drafted. Original macro namespace closure
and every unfinished production/reverse/sync/freshness/parity/delivery row remain
OPEN; no actual owner, executable coverage or completion is claimed.
