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
