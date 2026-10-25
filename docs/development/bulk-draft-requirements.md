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
