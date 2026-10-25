# Complete requirement draft for issues #759 and #772

The user requires all remaining implementation work to be drafted before any
further tests or experiments. Source review and source editing continue; all
new runtime, rule, test and workflow changes remain unverified. Do not start
trial generation, verification compiler checks, benchmarks, local tests or CI
during this phase. Automated source writing may construct implementation files,
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
| Resource and publication discipline | Single publisher; coordinator works alone | Continue alone, avoid extra dependency trees, create coherent commits without Rust hooks and defer CI-triggering pushes until drafting is complete. |

Complete source-family records and their open limitations are retained in
[history part one](bulk-draft-source-history-1.md) and
[history part two](bulk-draft-source-history-2.md). These records were split
without removing their source obligations or verification limitations.

The [local declarative draft](local-declarative-source-draft.md) now supplies
actual private root expansion, recursive forwarding, conservative hygiene
refusals and a separate original-compiler project entry. Complete originals,
CST inverses and independent JS/strict TS/native oracle source are drafted and
unrun. Architecture export/type-prefix closure, producer bootstrap, broader
owned/async domains, production adoption/parity, CI repairs and every incomplete
row above remain open.

The [conditional generic derive attribute draft](builtin-derived-outer-attributes-draft.md)
adds the complete generated attribute definition/use suffix, actual constructor
and predicate owners, real ungated registration expansions and full collector
bypass source. The finite producer joins one shared source closure to every
actual generic callback without promoting its namespace or caller-owner flags.
Complete originals/CST histories and independent JS/native oracle source are
drafted and unrun. Architecture type-prefix closure, producer bootstrap, nested
and exported macro effects, broader language/resource domains, production parity
and every unfinished requirement remain open.

The [cold future/resource caller draft](async-control-callers-draft.md) adds
actual imported cancellation, deadline and channel source rules through the
complete copied control adapter. It retains private source joins, checked meta,
cold/await boundaries, move/borrow flow, explicit receiver cleanup and complete
CST inverses. Independent JS/strict TS/native oracle source is drafted and unrun.
Rust forward/inverse and source-unit integration, broader async callbacks,
public numeric guards, HTTP resources and every unfinished row remain open.

The [canonical async resource inverse draft](async-control-inverse-draft.md)
adds full original reader/consumer copies, actual tuple/mutable-borrow/async
closure syntax proposals and fresh complete JS/meta/Rust reproduction. Full
originals/CST inverses and independent handwritten native, JS/strict TS and
refusal source are drafted and unrun. Source-unit installation, general Rust
and pending-future syntax, broader numeric/HTTP boundaries, production adoption
and every other unfinished row remain open.

The [physical async source-unit draft](async-control-unit-draft.md) now connects
the three source directions, actual native/Cargo/runtime mirrors, current paired
signature proposals and original fresh transaction/atomic installation contract.
Complete original adapter and profile/transaction substitutions plus independent
unrun receiving cases are retained. General source inference and async domains,
HTTP resources, transitive source-history composition, production adoption,
CI repairs and every unfinished row remain open.

The [transitive source-history draft](transitive-source-history-draft.md) now
forwards complete descendant rows across intermediate source families while
preserving each plan's direct file list and fresh physical/original-source joins.
Full original producer substitutions and independent unrun three-plan/source/
inverse regressions are retained. Whole-chain receiving, remaining CI repairs,
namespace/producer bootstrap, broader language/resource domains, production
adoption/parity and every unfinished requirement remain open.

The [configured enum variant namespace draft](configured-enum-variants-draft.md)
applies the existing original profile evaluator to exact variants through a
separate resolver and complete copied initial/output tool constructors. Selected
owned, derive-input and enclosing project paths compose them; original APIs,
unknown scopes and live shadows remain. Six complete source copies, both phases
and independent profile/source/tool/derive/project/refusal plus native cfg/glob
oracle cases remain unrun. Architecture/producer closure, production parity and
every unfinished requirement remain open.

The [guarded async numeric draft](async-control-u64-draft.md) now qualifies
actual dominating original u64 entry guards, native count parameters, canonical
Rust inverse guards and fresh paired numeric signatures. Complete originals,
CST/source inverses and independent unrun JS/strict TS/native oracle/refusal
source are retained. Broader numeric/control grammars, generic/recursive/async
and HTTP resources, namespace/bootstrap, production adoption, receiving/CI
repairs and every unfinished requirement remain open.

The [HTTP resource caller draft](http-resource-callers-draft.md) now provides
whole cold caller lowering, actual client/stream loans, all-exit cleanup,
distinct error-family propagation and canonical native inverse reproduction.
Full original adapter/reader copies, source substitutions, CST inverses and
independent unrun loopback/strict TS/native oracle/refusal source are retained.
Physical source units, borrowed protocol results, mixed-error adapters, broader
language/resource domains and every other unfinished requirement remain open.

The [physical HTTP source-unit draft](http-resource-unit-draft.md) adds the
closed profile, all actual native/Cargo mappings, mirrored opaque runtimes,
fresh paired input proposals and original Git conflict/atomic installation
contract in all three source directions. Full original substitutions and
independent receiving/refusal source are retained and unrun. Broader HTTP/error
and language domains, production adoption and every unfinished requirement
remain open.

The [common resource operation draft](http-resource-common-draft.md) composes
the actual text, callback-free primitive Result and JSON carrier libraries with
explicit Option domains, whole container moves and local string-root tracking.
Complete original source histories and independent unrun JS/strict TS/native
oracle/refusal source are retained. Option guards, wider language/resource
domains, namespace/bootstrap, production adoption and every unfinished
requirement remain open.

The [scalar loop draft](http-resource-scalar-loops-draft.md) adds actual mutable
Boolean/u64 locals, assignments, whole while-fragment ownership/type invariants,
scope-correct native mutability and complete reader/inverse rules. Full original
source histories and independent unrun JS/strict TS/native oracle/refusal source
are retained. Abrupt/exception exits, general resource/collection loops and
mutation, wider language domains, namespace/bootstrap, production adoption/parity
and every unfinished requirement remain open.

The [owned text state draft](http-resource-owned-text-state-draft.md) adds actual
owned String mutation, moved-slot reinitialization, all-root live-view protection
and complete native/loop state preservation. Full original source histories and
independent unrun JS/strict TS/native oracle/refusal source are retained. Abrupt/
exception exits, general resource/collection state, wider language domains,
namespace/bootstrap, production adoption/parity and every unfinished requirement
remain open.

The [abrupt resource loop draft](http-resource-abrupt-loops-draft.md) adds actual
nearest-loop break/continue, nested function returns, Result/Option propagation,
separate loop/function resource summaries and complete all-return type/root
joins. Complete original reader/projection/flow histories and independent unrun
JS/strict TS/native oracle and refusal source are retained. Continuing lexical
branches, labels, outcome-sensitive loop-entry changes, exceptional exits,
broader language/resource domains, namespace/bootstrap, production parity and
every unfinished requirement remain open.

The [continuing lexical branch draft](http-resource-scoped-branches-draft.md)
adds actual continuing scopes, single statements and else-if, complete incoming
state joins, scope-local cleanup and independent function/loop/scope exit
summaries. Complete original flow/projection histories, precise native owner
boundaries and independent unrun JS/strict TS/native oracle/refusal source are
retained. General shadowing, outcome-sensitive incompatible state, labels,
exceptional exits, namespace/bootstrap, production parity and every unfinished
requirement remain open.

The [owned JSON resource state draft](http-resource-json-state-draft.md) composes
existing matching field/index updates, append, removal, merge, key/length
queries and optional parsing with actual native/root/runtime joins and owned
JSON loop/branch replacement. Full original contracts/capture/flow/projection
histories and independent unrun JS/strict TS/native oracle/refusal source are
retained. Borrowed JSON views, list/callback domains, incompatible state joins,
namespace/bootstrap, production parity and every unfinished requirement remain
open.

The [borrowed JSON resource draft](http-resource-json-views-draft.md) adds the
actual native index facade, shared input aliases, local JSON-backed views,
complete multi-root protection and native JSON/text reference lifetimes. Full
original source histories and independent unrun JS/strict TS/native identity,
value, refusal and inverse source are retained. Temporary loans, borrowed list
iteration, incompatible state joins, namespace/bootstrap, production parity and
every unfinished requirement remain open.

The [owned JSON list/shared slice draft](http-resource-json-lists-draft.md)
composes every existing list-bearing state operation with distinct owned/shared
domains, actual operation-derived input types, native qualified Vec/slice
signatures, root/move protection and paired-source-unit proposals. Complete
original histories and independent unrun JS/strict TS/native value, identity,
refusal and inverse source are retained. General iteration/callbacks, generic
element domains, incompatible state joins, namespace/bootstrap, production
parity and every unfinished requirement remain open.

The [resource collection callback draft](http-resource-callbacks-draft.md)
composes existing map/filter-map, filter, any/all, find and fold with whole
helper and capture-free inline callback checking, actual owned accumulator
domains, typed native closures and complete inverse rules. Full original
histories and independent unrun JS/strict TS/native value, short-circuit,
Some(Null), refusal and source-inverse cases are retained. General captures,
typed-arrow inverses, generic iterators, namespace/bootstrap, production parity
and every unfinished requirement remain open.

The [original typed callback draft](http-resource-typed-callbacks-draft.md)
adds actual imported operation/Parameters/ReturnType and list-element annotation
rules, contextual owning/shared domain obligations, original native spans and
complete JavaScript erasure inverses through nested branch/loop/callback flows.
Full original source histories and independent unrun strict TS/JS, native token
equivalence and refusal cases are retained. Broader aliases and generic/owned
signatures, captures, namespace/bootstrap, production parity and every unfinished
requirement remain open.

The [original function return/source annotation draft](http-resource-function-returns-draft.md)
adds ordinary synchronous written return obligations over complete inferred
bodies and reusable canonical JS input/return docs when TypeScript types are
erased. It preserves owning/shared results, old recursive obligations, original
doc corrections and full comment-safe source inverses. Complete original
histories and independent unrun JS/strict TS, repeated-round-trip and refusal
cases are retained. Generic/owned/future signatures, namespace/bootstrap,
production parity and every unfinished requirement remain open.

The [shared JSON slice iteration draft](http-resource-shared-iteration-draft.md)
adds actual const-element loops, shared and owned list loans, nearest-loop and
function exits, complete native reader/projection inverses and original input
domain initialization. Full original histories and independent unrun JS/strict
TS/native value, ordering, identity, refusal and forged-meta source are retained.
General iterator protocols, async iteration, namespace/bootstrap, production
parity and every unfinished requirement remain open.

The [immediate read-only capture draft](http-resource-captures-draft.md) adds
actual enclosing scalar/shared bindings, lexical parameter shadows, nested
free-use summaries and complete native closure/source inverses. Full original
histories and independent unrun JS/strict TS/native value, ordering, capture,
refusal and forged-meta source are retained. Mutable/owned/async captures,
generic signatures, namespace/bootstrap, production parity and every unfinished
requirement remain open.

The [original owned and settled signature draft](http-resource-owned-signatures-draft.md)
adds actual operation-derived owning String/JSON/list/container inputs,
Awaited descriptors, cold future return obligations, owning recursive groups
and shared native/paired signature proposals. Full original histories and
independent unrun JS/strict TS/native value, move, recursion, refusal and
forged-meta source are retained. Generic/method/resource-state recursion,
namespace/bootstrap, production parity and every unfinished requirement remain
open.

The [actual filesystem composition draft](http-resource-filesystem-draft.md)
adds eighteen original string-path std/tokio operations, fresh independent
filesystem semantic qualification, distinct I/O Results, deferred async bodies
and additive current declarations/source-unit assets. Full originals and
independent unrun JS/strict TS/native ordering, Unicode, failure, polling,
signature, refusal and forged-meta source are retained. Byte vectors and broader
filesystem APIs, namespace/bootstrap, production parity and every unfinished
requirement remain open.

The [owned octet/shared byte draft](http-resource-bytes-draft.md) adds both
original filesystem reads, complete owning/shared byte domains, actual JSON
byte parsing, successful original Result/Option type projections and whole
native/source inverses. Full originals and independent unrun JS/strict TS/native
UTF8, empty, Some(Null), polling, ownership, root, refusal and forged-meta source
are retained. General byte iterators, Result fallbacks, namespace/bootstrap,
production parity and every unfinished requirement remain open.

The [complete Result failure fallback draft](http-resource-result-fallbacks-draft.md)
adds actual alternate error branches with full return/root/resource checks,
filesystem read-and-parse composition, every helper release exit and complete
canonical native inverses. Full originals and independent unrun JS/strict
TS/native value, missing-file, polling, Some(Null), cleanup, refusal and
forged-meta source are retained. Error inspection, outcome-sensitive release,
namespace/bootstrap, production parity and every unfinished requirement remain
open.

The [Option loop and streaming draft](http-resource-option-loops-draft.md)
adds complete absent break/continue branches, nearest-loop and function outcome
joins, actual binary HTTP pull accumulation and native/source inverses. Full
originals and independent unrun JS/strict TS/loopback/native scalar, EOF, binary,
cleanup, refusal and forged-meta source are retained. Seven independent native
oracle fixtures now join the existing gated Rust integration-test discovery.
Broader streaming/protocol applications, namespace/bootstrap, production parity
and every unfinished requirement remain open.

The [owning/scalar Result callback draft](http-resource-outcome-callbacks-draft.md)
adds actual map/chaining/recovery/error operations, full Result library source
censuses, owning callback inputs, contextual annotations and complete native
inverses. Full originals and independent unrun JS/strict TS/native selection,
Unicode, saturation, move, helper, refusal and forged-meta source are retained.
General Option and borrowed-output callbacks, namespace/bootstrap, production
parity and every unfinished requirement remain open.

The [actual Option callback/source-unit draft](http-resource-option-callbacks-draft.md)
adds actual primitive map/chaining/lazy fallbacks, fresh optional native source
censuses and original physical receiving transactions with complete extra native
mappings. Full originals and independent unrun JS/strict TS/native callback,
Unicode, arity, source, physical three-language edit, conflict and forged-meta
cases are retained. Borrowed-output callbacks, namespace/bootstrap, production
parity and every unfinished requirement remain open.

The [one native source-operation draft](native-source-operation-draft.md)
wraps all 146 original preparers before eager child evaluation, limits private
syntax reuse to one genuine synchronous operation and preserves every fresh
semantic/binding/source check. Three full-original groups retain the original
64-row family bound. Typed descendant forwarding, complete overlapping history
joins, nested original guards and whole descendant CLI status are drafted with
independent unrun cases. No receiving or speed qualification is claimed.
Remaining parser/timing/CI obligations, namespace/bootstrap, production parity
and every unfinished requirement remain open.

The [local resource helper draft](http-resource-local-functions-draft.md) now
checks actual callee bodies before callers, composes cold futures and single
returned roots, preserves source order and separates imported/local binding
routes. Full original source histories and independent unrun JS/strict TS/native
oracle/refusal source are retained. Recursive/generic/method and release/multiple-
root joins, wider language/resource domains, namespace/bootstrap, production
adoption and every unfinished requirement remain open.

The [helper release draft](http-resource-helper-releases-draft.md) adds actual
exclusive input state at every exit, complete helper release joins, caller
disposition and local cleanup in Result/Option inverses. Full original source
histories and independent unrun JS/strict TS/native oracle/refusal source are
retained. Partial outcome-sensitive releases, multiple roots, recursion,
generics/methods, wider language/resource domains, namespace/bootstrap,
production adoption and every unfinished requirement remain open.

The [returned-root set draft](http-resource-root-sets-draft.md) joins every actual
helper argument root through values, Result/Option conversions and branches,
retains native shared lifetimes and protects all possible local owners. Full
original source histories and independent unrun JS/strict TS/native oracle/
refusal source are retained. Partial release, recursion/generics/methods, wider
language/resource domains, namespace/bootstrap, production adoption and every
unfinished requirement remain open.

The [restricted recursion draft](http-resource-recursion-draft.md) adds actual
strongly connected function groups, original explicit return obligations, whole
synchronous scalar/owned body checking and canonical native annotation/inverse
rules. Full original source histories and independent unrun JS/strict TS/native
oracle/refusal source are retained. General recursion/signatures, loops/mutation,
language/resource domains, namespace/bootstrap, production adoption/parity and
every unfinished requirement remain open.

The [fixed-width caller draft](http-resource-numeric-draft.md) composes actual
unsigned integer/primitive Option libraries with guarded public domains, strict
primitive comparisons, recursive arithmetic and complete inverse/unit mappings.
Full original source histories and independent unrun JS/strict TS/native oracle/
refusal source are retained. Wider numeric/language/resource domains, loops and
mutation, namespace/bootstrap, production adoption/parity and every unfinished
requirement remain open.

The [Option guard draft](http-resource-option-guards-draft.md) adds whole absent
branches, every-exit resource cleanup, explicit fallback domains, Some payload
moves, same-Option propagation and complete canonical native inverse rules.
Full original sources/CST histories and independent unrun JS/strict TS/native
oracle/refusal source are retained. General loops/callbacks, wider language and
resource domains, namespace/bootstrap, production adoption and every unfinished
requirement remain open.

The [original-root HTTP text draft](http-resource-borrowed-text-draft.md) adds
actual input-rooted borrowed protocol Results, local/branch root propagation,
native lifetime emission and complete inverse reproduction. Complete original
source substitutions and independent unrun semantic, lifetime/refusal and native
oracle source are retained. Broader local loans/error domains, production
adoption and every unfinished requirement remain open.

The [explicit deadline result draft](http-deadline-results-draft.md) adds three
matching by-value native/JS adapters, all five control-error strings, whole
nested Result move rules, canonical inverse and physical source-unit integration.
Full original source histories and independent unrun variant/refusal/strict TS/
native oracle source are retained. General language/resource domains, original
namespace/bootstrap, production adoption/parity and every unfinished requirement
remain open.

The [closed HTTP deadline core draft](http-deadline-core-draft.md) adds three
matching native/JS operations with actual settlement/Drop cleanup, late owned
stream disposal, complete root/library source histories and additive receiving
assets. Independent unrun loopback, strict TS, settlement-edge and Rust oracle
source is retained. General HTTP caller lowering/inverses/units, other async
domains, namespace/bootstrap, production adoption/parity, remaining CI/receiving
repairs and every unfinished requirement remain open.

The [original TypeScript alias draft](http-resource-type-aliases-draft.md) adds
actual nongeneric alias chains, all-alias source obligations and expanded JS
docs with full erasure/CST inverses. Complete original substitutions and
independent unrun signature, callback, ownership, numeric and refusal cases are
retained. Subsequent source-unit alias retention, broader language domains,
namespace/bootstrap, production parity and every unfinished requirement remain
open.

The [paired TypeScript alias retention draft](http-resource-unit-type-aliases-draft.md)
adds fresh original type-only declarations and actual import rejoining after JS
or Rust authority edits, whole target reproduction and full old/generated CST
inverses. Complete originals and independent unrun physical three-language,
import-conflict, source and forged-plan cases are retained. Generic/method
domains, namespace/bootstrap, production parity and every unfinished requirement
remain open.

The [original type-template draft](http-resource-type-templates-draft.md) adds
exact original generic alias slots, lexical argument environments, complete
unused-declaration/cycle checks and expanded target docs. Full original source
histories and independent unrun signature/callback/recursion/settlement/ownership
and refusal cases are retained. Generic functions, constraints/defaults, methods,
namespace/bootstrap, production parity and every unfinished requirement stay open.

The [written/cold return draft](http-resource-cold-return-types-draft.md) adds
ordinary JavaScript return-doc obligations, freshly joined real deferred generic
declarations and complete native async return docs. Full originals and
independent unrun JS/strict TS/native lazy/value/source-refusal cases are
retained; a tenth oracle joins gated CI discovery. General generic/method/async
domains, namespace/bootstrap, production parity and every unfinished requirement
remain open.

The [post-test loop draft](http-resource-do-loops-draft.md) adds actual do/while
source checking, condition gates on normal fallthrough and nearest continues,
nested control isolation and complete canonical native inverses. Full originals
and independent unrun JS/strict TS/native/refusal cases are retained; an
eleventh oracle joins gated CI discovery. Wider loop/language domains,
namespace/bootstrap, production parity and every unfinished requirement remain open.

The [conditional value draft](http-resource-conditional-values-draft.md) adds
whole actual ternary arms in returns/locals/arguments, identical incoming
state/resource joins, all borrowed roots and complete native expression inverses.
Full originals and independent unrun JS/strict TS/native/refusal cases are
retained; a twelfth oracle joins gated CI discovery. Partial moves, broader
language domains, namespace/bootstrap, production parity and every unfinished
requirement remain open.

The [complete partitioned export draft](partitioned-compiler-export-draft.md)
adds a complete original exporter copy with exact 2,048-file inventory groups,
the existing compiler logical-file bound and unchanged per-file/global-byte/Git
limits. Every original source/license and receiving workload is retained. Full
originals and independent unrun whole-closure/2,049-input/boundary cases are
drafted. Export receiving/freshness, namespace/bootstrap, production parity and
every unfinished requirement remain open.

The [strict Boolean value draft](http-resource-boolean-values-draft.md) adds
negation and short-circuit locals/arguments/returns through the complete original
condition/state checker and native inverse. Full originals and independent unrun
JS/strict TS/native/refusal cases are retained; a thirteenth oracle joins gated
CI discovery. Wider language domains, namespace/bootstrap, production parity
and every unfinished requirement remain open.

The [owned list literal draft](http-resource-list-literals-draft.md) adds dense
actual JSON list constructors, ordered owned element checks, collection/iteration
composition and complete fully qualified native vector inverses. Full originals
and independent unrun JS/strict TS/native/refusal cases are retained; a
fourteenth oracle joins gated CI discovery. Wider collection/language domains,
namespace/bootstrap, production parity and every unfinished requirement remain open.

The [source-qualified signed family draft](http-resource-signed-numbers-draft.md)
adds actual i64 operations/Option/Result callbacks, distinct complete scalar
entry guards, source-local literal constraints, mutable/recursive/cold return
composition and full native inverses. Complete originals and independent unrun
JS/strict TS/native/boundary/refusal cases are retained; a fifteenth oracle joins
gated CI discovery. Signed payload-container guards, wider language/numeric
domains, namespace/bootstrap, production parity and every unfinished requirement
remain open.

The signed numeric source review now also retains a complete successor for
grouped actual-call argument selection and bounded conditional constraints, with
full originals/CST inverses and independent unrun cases. Every unfinished bulk
requirement and every verification obligation remain open.

The [original generic bound/default draft](http-resource-type-bounds-draft.md)
adds exact actual type-argument constraints, trailing/earlier-slot defaults,
bounded callable/indexed template domains and full declaration query retention
across JS/Rust source-unit edits. Complete originals and independent unrun
JS/strict TS/physical transaction and refusal cases are retained. Generic
executable functions, general constraints/variance/methods, namespace/bootstrap,
production parity and every unfinished requirement remain open.

The [original lexical scope draft](http-resource-lexical-scopes-draft.md) adds
complete incoming-state joins, local cleanup, nearest-loop exits, terminal
function returns and canonical native block inverses. Complete originals and
independent unrun JS/strict TS/native/refusal cases are retained; a sixteenth
oracle joins gated CI discovery. Shadowing, exceptions, broader language domains,
namespace/bootstrap, production parity and every unfinished requirement remain open.

The [original scalar for-header draft](http-resource-for-headers-draft.md) adds
actual initializer/condition/update rules, scoped header lifetimes, all nearest
continue/fallthrough suffixes and range-proven unit counter updates. Source
review also connects existing numeric constraints to declaration literals.
Complete originals and independent unrun JS/strict TS/native/boundary/refusal
cases are retained; a seventeenth oracle joins gated CI discovery. General
Number/range loops, broader language domains, namespace/bootstrap, production
parity and every unfinished requirement remain open.

The [original local annotation/type-wrapper draft](http-resource-local-annotations-draft.md)
adds actual local type obligations, closed native domain checks, alias-expanded
JSDoc retention, original parenthesized JSDoc checks and checked as/prefix/
satisfies/non-null wrappers. Full originals and independent unrun JS/strict TS/
native/refusal cases are retained. Structural types, domain-changing casts,
namespace/bootstrap, production parity and every unfinished requirement remain open.

The [original declaration list draft](http-resource-declaration-lists-draft.md)
adds sequential actual local/header declarations, ordered comma header effects,
last-declaration guards and correctly scoped header mutability. Complete originals
and independent unrun JS/strict TS/native/ordering/refusal cases are retained.
General expression sequences, wider language domains, namespace/bootstrap,
production parity and every unfinished requirement remain open.

The [exact scalar text equality draft](http-resource-text-equality-draft.md)
adds nonconsuming original String comparisons and read-only owned text captures
for actual immediate callbacks, retaining all move/root/state refusals. Full
originals and independent unrun JS/strict TS/native/Unicode/refusal cases are
retained; an eighteenth oracle joins gated CI discovery. Wider captures/language
domains, namespace/bootstrap, production parity and every unfinished requirement
remain open.

The [terminal scalar switch draft](http-resource-switches-draft.md) adds actual
stable selectors, checked literal/stacked labels, shared case lexical census,
complete returning arms and canonical scoped native case-tree inverses. Full
originals and independent unrun JS/strict TS/native/Unicode/TDZ/refusal cases are
retained; a nineteenth oracle joins gated CI discovery. Continuing switches,
fallthrough/dynamic labels, namespace/bootstrap, production parity and every
unfinished requirement remain open.

The [original executable generic identity draft](http-resource-generic-identity-draft.md)
adds a complete unchanged-input theorem, actual concrete ownership/root joins,
scalar callback specialization, genuine native generic inverses and fresh paired
signature proposals. Eight complete originals and independent unrun JS/strict TS/
native/refusal cases are retained; a twentieth oracle joins gated CI discovery.
General executable generics, explicit instantiation, methods/classes/interfaces,
namespace/bootstrap, production parity and every unfinished requirement remain open.

The [original explicit identity call draft](http-resource-generic-calls-draft.md)
adds one actual checked type argument, alias/current-operation obligations and
native-domain-preserving argument docs across JS erasure. Four complete originals
and independent unrun JS/strict TS/native/range/ownership/refusal cases are
retained. General generic bodies, higher-order instantiation, namespace/bootstrap,
production parity and every unfinished requirement remain open.

Source review also drafts the missing Boolean-negation/unit observations in the
canonical native source proposal's local domain reader. This lets whole-source
checking reach negated Boolean JSON constructors and concrete generic unit
applications; observations still grant no semantic or source permit. Two full
originals, both ordered CST/source inverses and independent unrun handwritten
native/JS/strict TS/refusal cases are retained. Every unfinished requirement and
verification obligation remains open.

The [common original statement draft](http-resource-common-statements-draft.md)
batches checked single-statement loop bodies, bounded original empty statements,
empty stacked switch labels and equal-domain nonstrict equality spellings.
Six complete originals and independent unrun JS/strict TS/native/refusal cases
are retained. Coercions, implicit void returns, broader effects/language domains,
namespace/bootstrap, production parity and every unfinished requirement remain open.

The [linear generic forwarding draft](http-resource-generic-linear-draft.md)
adds original local aliases and genuine complete unchanged-value helper chains,
exact one-move/no-drop obligations, lexical slot checks and independent native
dependency closure. Six complete originals and independent unrun JS/strict TS/
native/refusal cases are retained; a twenty-first oracle checks actual native
drop counts after the JavaScript gate. General generics, namespace/bootstrap,
production parity and every unfinished requirement remain open.

The [original numeric container ingress draft](http-resource-container-guards-draft.md)
adds complete successful-payload guards for primitive numeric Option/textual
Result inputs, guarded public signed domains and exact canonical native guard
inverses. Five full originals and independent unrun JS/strict TS/native/range/
refusal cases are retained; a twenty-second oracle joins gated CI discovery.
Recursive containers, other numeric error families, namespace/bootstrap,
production parity and every unfinished requirement remain open.

The [native Promise/thenable obligation draft](http-resource-promise-types-draft.md)
adds distinct native/eager, structural thenable and checked cold type descriptors,
actual Awaited/alias domains and precise cold return obligations. Five full
originals and independent unrun JS/strict TS/native/lexical/refusal cases are
retained. Generic deadline typing, wider async domains, namespace/bootstrap,
production parity and every unfinished requirement remain open.

The [actual generic deadline type draft](http-resource-deadline-types-draft.md)
adds complete original declaration/slot/constructor joins, known uninstantiated
inputs, qualified control-result type witnesses and full native source inverses.
Five complete originals, the original declaration asset and independent unrun
JS/strict TS/native/source/refusal cases are retained. Generic callback execution,
recursive numeric ingress, namespace/bootstrap, production parity and every
unfinished requirement remain open.

The [source-typed nested numeric ingress draft](http-resource-nested-guards-draft.md)
adds actual qualified parameter constructor chains, complete successful payload
paths and original range obligations through nested Option/control/text/I/O
results. Five complete originals and independent unrun JS/strict TS/native/path/
refusal cases are retained; a twenty-third oracle uses real native ControlError.
Numeric collections, wider async effects, namespace/bootstrap, production parity
and every unfinished requirement remain open.

The [pure generic deadline source draft](http-resource-pure-deadlines-draft.md)
connects actual single-expression async factories, their contextual child input,
checked immutable captures, pure operation trees and owning non-resource Result
slots to native typed async closures and fresh whole-source inverse checking.
Seven complete original sources and both substitution phases are retained;
JS/strict TS/native inverse, cancellation/cleanup/refusal cases and real native
library oracle source remain unrun. Effectful or awaited callbacks, wider
resource ownership, namespace/bootstrap, production adoption/parity and every
unfinished requirement above remain open. No test or experiment ran.

The [inline textual macro source draft](scoped-local-declarative-draft.md)
copies the complete original source/project adapters for genuine inline module
views, prior-definition inheritance, local shadows and complete source inverses.
Three full original source copies, both substitution phases, independent
JS/strict TS/refusal cases and native textual-scope oracle source remain unrun.
Function-local/external-file inheritance, architecture namespace and attribute
producer bootstrap, production qualification and every unfinished row remain
open. Original root-only APIs and resource bounds retain their contracts.

The [native owner index draft](native-source-owner-index-draft.md) replaces
repeated per-edit walks with one actual syntax-tree walk per substitution step.
Every exact source/unique-owner/containment/nonoverlap/CST/physical-history check
and original bound remains. Two complete source copies and independent boundary,
all-owner, 128-edit, stale/ambiguous/source-change cases remain unrun. This is
not measured CI or performance repair evidence; all unfinished rows stay open.

The [cancellable deadline tail draft](http-resource-cancellable-deadlines-draft.md)
composes the actual original sleep/send cancellation contracts with one awaited
child-token tail, Copy/shared captures and full argument purity checking.
Three complete original sources, both substitution sequences, independent
JS/strict TS/queue cleanup/native inverse cases, real library Rust oracles and
physical three-direction source transactions remain unrun. Exclusive resource
captures, wider effects/cleanup, namespace/bootstrap, production adoption/parity
and every unfinished requirement remain open. No test or experiment ran.

The [explicit deadline slot draft](http-resource-explicit-deadlines-draft.md)
checks original generic call arguments against whole actual callback values and
retains signed native domains through TS erasure and Rust inversion. It also
repairs the source-reviewed distinction between scalar and operation tail kinds
before their full purity/cancellation checks. Five complete original sources,
both substitution phases, independent JS/strict TS/native inverse/tampering and
real native range oracle cases remain unrun. Every unfinished requirement
remains open; no test, experiment or performance/coverage measurement ran.

The [written builtin attribute namespace draft](registered-builtin-caller-attributes-draft.md)
joins twelve complete original Rust parser callbacks, normal AST construction,
actual builtin registration and custom-attribute exclusion to exact original
caller item spans. The owned enclosing path selects the explicit successor;
original resolver APIs retain their domains and truncated item carriers cannot
erase unknown producers. Four complete source copies, both substitution phases,
independent namespace/view/source/refusal cases and native oracle source remain
unrun. Architecture exports, other producers, derive/tool bootstrap, production
qualification and every unfinished requirement above remain open.

The [registered builtin tool context draft](registered-builtin-tool-contexts-draft.md)
composes complete copied initial/output tool constructors, the explicit tool-first
derive input and selected enclosing project with the written builtin source path.
Original constructors/default project remain; unknown owners, type shadows,
architecture globs and same-scope cycles retain their obligations. Five complete
source copies, both phases, independent context/source/refusal/project cases and
ordinary native tool/derive oracle source remain unrun. Every unfinished row
above remains open; no validation or fresh coverage evidence is claimed.

The [passive macro attribute draft](passive-macro-attributes-draft.md) carries
original passive builtin definition/output attributes through separate complete
engine/source/project copies. One closed synchronous source frame checks exact
original items and actual generated domains; old APIs, hygiene, source ordering,
unknown producer refusals and original bounds remain. Five complete source
copies, both phases, independent lifecycle/refusal/scope/project target cases
and native macro oracle source remain unrun. Architecture exports, derived and
conditional producers, bootstrap, production qualification and every unfinished
requirement above remain open. No tests or experiments ran.

The [original grouped call draft](http-resource-call-grouping-draft.md) composes
actual operation/helper names, generic forwarding, numeric hints and deferred
body selection while preserving original type obligations and raw source bounds.
Entry no-ops no longer interrupt complete guard selection. Seven complete
originals, both rule phases and independent direct JS/strict TS/native inverse,
refusal and oracle source remain unrun. Every unfinished requirement above
remains open; no tests, experiments or fresh coverage measurements ran.

The [owned byte literal draft](http-resource-byte-literals-draft.md) checks dense
original bounded BigInt arrays, retains explicit native u8 widths and composes
existing ownership, temporary shared loans and JSON-byte parsing in both source
directions. Four complete originals, both rule phases and independent direct
JS/strict TS/native inverse/refusal and real-library oracle source remain unrun.
Empty/calculated/wider vectors and every unfinished requirement remain open.

The [native lexical binding draft](http-resource-native-bindings-draft.md)
adds complete reader/translator copies, exact original value binding spans,
previous-scope initializer resolution, collision-free local renaming and physical
source-unit composition. Whole bodies still re-enter the original checker and
must reproduce the normalized native source, with full original CST inverses.
Five complete source copies, both phases and independent native/JS/strict TS,
physical transaction, refusal and oracle source remain unrun. Wider patterns,
namespace/producer closure and every unfinished requirement remain open.

The [native local type draft](http-resource-native-local-types-draft.md) retains
original let annotations as independently checked whole-value obligations and
preserves actual signed native local widths through target type witnesses.
Fresh local joins use one flow traversal; no new cross-invocation cache exists.
Five complete originals, both rule phases and independent 128-declaration,
target/native/refusal and oracle source remain unrun. Wider native types and
every unfinished requirement above remain open.

The [native control spelling draft](http-resource-native-control-draft.md)
composes exact original return targets, optional-else statement bodies and
else-if chain braces with the lexical/type source path. Earlier and loop returns
keep their targets; whole-source/native checks remain mandatory. Three complete
originals, both phases and independent branch/callback/generic/mutable/physical
unit/refusal and native oracle source remain unrun. Wider control, namespace
closure and every unfinished requirement remain open.

The [native Option let-else draft](http-resource-native-option-patterns-draft.md)
composes exact original Some/None fallback syntax, prior initializer scope and
the existing checked propagation/move path. Prelude constructor patterns cannot
be promoted into ordinary local bindings. Three complete originals, both phases
and independent absent/range/text/source/refusal plus native drop oracle cases
remain unrun. Wider patterns and every unfinished requirement remain open.

The [native unit spelling draft](http-resource-native-unit-draft.md) retains
original omitted unit signatures, empty bodies and actual bare-return targets,
including cold callbacks and the existing cancellation/disposal contracts.
Three complete originals, both phases and independent target/native/refusal
and real library oracle source remain unrun. Wider syntax, production parity
and every unfinished requirement above remain open.

The [native Result extraction match draft](http-resource-native-result-match-draft.md)
retains original successful/error binders, exact captured errors and initializer
scope through existing checked propagation and local type obligations. Two
complete originals, both phases and independent target/native/error-family,
source/refusal and oracle cases remain unrun. Wider Result behavior, production
adoption/parity and every unfinished requirement remain open.

The [native Option extraction match draft](http-resource-native-option-match-draft.md)
retains exact original initializer and arm scope while composing successful
identity/None-return arms with existing checked propagation. Four complete
originals, both phases and independent absent/range/ownership/source/refusal
and native oracle source remain unrun. Wider matches, namespace/producer closure
and every unfinished requirement above remain open.
