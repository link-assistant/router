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
