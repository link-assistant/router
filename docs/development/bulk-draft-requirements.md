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
[history part four](bulk-draft-source-history-4.md) and
[history part five](bulk-draft-source-history-5.md). These records were split
without removing their source obligations or verification limitations.

Current source drafts include paired JSON/text/callback operations, bounded
repeated-stage packets and guarded adoption, ordinary local alias candidates,
shared arithmetic/logical/conditional source composition and lazy Option errors.
All implementation and independent case source remains unrun. Macro/attribute/
Span/visitor/export/type-prefix closure, wider production language and parity,
reverse/synchronization/freshness, CI repairs and receiving qualification remain
unfinished. Every table requirement stays open; no current completion percentage
or newly executable coverage is claimed.

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

The [callback call role draft](callback-call-role-source-draft.md) joins declared
qualified callback return roles and Result try payload candidates to actual
chronological/integer locals and written Option inputs in Result selectors. Seven
equations and independent unrun eight-API/four-caller/refusal/restaging/JS/strict
TS/invalid-nonadmission/native/export cases are drafted. Real callback/Try/type/
owner checks remain separate; every unfinished namespace/production/reverse/
sync/freshness/parity/delivery row stays OPEN.

The [eager Option error draft](option-eager-error-source-draft.md) adds ten paired
eager or borrowed-to-String error conversions, real Result mappings and fresh
generic/native source successors. Thirteen equations and independent unrun ABI/
order/refusal/two-API/seven-caller/JS/strict TS/paired reverse/native/no-Rust-source/
export cases are drafted. Wider Try/errors, borrowed resource results and every
unfinished namespace/production/reverse/sync/freshness/parity/delivery row stay
OPEN; no coverage is claimed.

The [core Try projection draft](core-try-projection-source-draft.md) composes
actual Option/Result question marks through qualified calls, scalar expressions
and integer/local receivers. Four equations and independent unrun two-API/
six-caller/refusal/restaging/JS/strict TS/invalid-context/native/export source are
drafted. Actual Try/type/source checks remain independent and all unfinished
namespace/production/reverse/sync/freshness/parity/delivery rows remain OPEN.

The [qualified callback scope draft](qualified-callback-scope-source-draft.md)
isolates actual known inline callback arguments from outer integer/local source
inference while preserving full callback source for the independent checker.
Ten equations and independent unrun syntax/shadow/refusal/two-API/three-caller/
restaging/JS/strict TS/invalid-callback/native/export source are drafted. Wider
callback bodies and all unfinished namespace/production/reverse/sync/freshness/
parity/delivery rows remain OPEN.

The [shared callback composition draft](core-callback-composition-source-draft.md)
composes declared Option/primitive Result/owning Result callback returns and Try
payload source through four carrier adopters and actual local readers. Eight
equations and independent unrun ten-API/eight-caller/refusal/JS/strict TS/invalid-
body/native/export source are drafted. Actual semantic checks stay independent;
all unfinished namespace/production/reverse/sync/freshness/parity/delivery rows
remain OPEN.

The [carrier method scope draft](carrier-method-scope-source-draft.md) composes
original common inline method callbacks with known qualified scopes, preventing
callback-local bindings from leaking into outer source rules. Nine equations and
independent unrun grammar/coordinates/shadow/refusal/eight-API/three-chain/JS/
strict TS/invalid-type/native/export source are drafted. Every unfinished
namespace/production/reverse/sync/freshness/parity/delivery row remains OPEN.

The [shared callback body draft](callback-core-body-source-draft.md) reuses the
actual integer engine with the existing text adapter across all three callback
adopters, retaining complete child/source histories and unchanged-round bounds.
Twelve equations and independent unrun ten-width/six-API/ten-caller/boundary/JS/
strict TS/paired reverse/native/export source are drafted. Every unfinished
namespace/production/reverse/sync/freshness/parity/delivery row remains OPEN.

The [carrier binding Try draft](carrier-binding-try-source-draft.md) composes
actual lexical Option/Result question marks through shared local/boolean/numeric
source and direct/grouped integer receivers. Six equations and independent unrun
two-API/six-caller/refusal/JS/strict TS/invalid-context/native-storage/order/export
source are drafted. Actual Try/type/binding checks remain independent and all
unfinished namespace/production/reverse/sync/freshness/parity/delivery rows stay
OPEN.

The [text carrier join draft](text-carrier-join-source-draft.md) shares closed
encoded/written carrier roles and actual Try/core/callback text payloads through
text adopters and chronological locals. Five equations and independent unrun
two-API/eight-caller/domain/refusal/JS/strict TS/native/export source are drafted.
Actual type/binding/Try/ownership checks stay independent and all unfinished
namespace/production/reverse/sync/freshness/parity/delivery rows remain OPEN.

The [callback parameter draft](callback-source-parameters-draft.md) shares closed
temporary wrapper declarations and preserves mixed immutable carrier/text roles
needed by numeric source consumers. Six equations and independent unrun width/
domain/refusal/six-API/three-caller/JS/strict TS/native/export source are drafted.
Actual capture/binding/type/ownership checks remain independent; all unfinished
namespace/production/reverse/sync/freshness/parity/delivery rows remain OPEN.

The [core/callback operand draft](core-callback-operand-source-draft.md) composes
known callback return candidates inside actual core arguments, preserving source
and evaluation order. Two equations and independent unrun six-API/five-caller/
domain/refusal/JS/strict TS/invalid-body/native/export source are drafted. Actual
body/type/source checks stay independent and all unfinished namespace/production/
reverse/sync/freshness/parity/delivery rows remain OPEN.

The [nested carrier body draft](callback-carrier-body-source-draft.md) composes
all four existing carrier selectors inside shared callback text/integer body
rules, with explicit depth/round/complete-proposal byte limits. Twelve equations
and independent unrun four-adapter/six-API/six-caller/refusal/JS/strict TS/paired
reverse/native/export source are drafted. Every unfinished namespace/production/
reverse/sync/freshness/parity/delivery row remains OPEN.

The [integer method chain draft](integer-method-chain-source-draft.md) composes
consecutive known scalar methods in one original substitution with bounded link
count and unchanged argument order. Two equations and independent unrun two-API/
six-caller/chain/refusal/JS/strict TS/paired reverse/native-order/export source are
drafted. Every unfinished namespace/production/reverse/sync/freshness/parity/
delivery row remains OPEN.

The [Option predicate draft](option-predicate-source-draft.md) composes native
is_some_and/is_none_or source through existing bool map/fallback APIs and closed
text/bool equality candidates. Five equations and independent unrun six-API/
twelve-caller/refusal/JS/strict TS/paired reverse/native-order/export source are
drafted. Every unfinished namespace/production/reverse/sync/freshness/parity/
delivery row remains OPEN; source occurrences are not executable coverage.

The [core function item draft](core-function-item-source-draft.md) reifies known
callback function items through their exact original core paths and fresh names.
Six equations and independent unrun grammar/domain/refusal/hygiene/budget/six-API/
ten-caller/JS/strict TS/native/export source are drafted. Actual binding/type/
ownership checks remain independent and every unfinished namespace/production/
reverse/sync/freshness/parity/delivery row remains OPEN.
