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

The [tool prefix input draft](tool-prefix-external-source-draft.md) closes explicit
external-prelude omissions across all six tool constructors and binds sealed
contexts to complete original resolver inputs in the main and five retained
resolver copies. Nine equations and independent unrun constructor/resolver/
mutation/refusal/native/export source are drafted. All global namespace and
production/reverse/sync/freshness/parity/delivery requirements remain OPEN.

The [general qualified function draft](qualified-function-item-source-draft.md)
reuses a complete original CST engine for same-path callback reification, with
context-only return candidates and unchanged independent callee/type checks.
Five equations and independent unrun six-API/fourteen-caller/hygiene/refusal/
JS/strict TS/native/export source are drafted. Every unfinished namespace and
production/reverse/sync/freshness/parity/delivery requirement remains OPEN.

The [layered format macro draft](layered-format-macro-source-draft.md) copies the
complete CST engine for exact canonical format! transport and keeps macro
arguments visible in all six source selectors. Twenty-five equations and unrun
old/new-API/header/refusal/twelve-adopter/six-caller/JS/strict TS/export source are
drafted. All wider namespace/production/reverse/sync/parity/delivery rows stay OPEN.

The [primitive display draft](primitive-display-source-draft.md) routes bool and
all ten fixed integer widths through the existing checked core formatting
abstraction, preserving source order and primitive namespace refusals. Seventeen
equations and independent unrun width/edge/literal/alias/chain/six-API/nineteen-
caller/JS/strict TS/native/export source are drafted. Every wider namespace,
production/reverse/sync/freshness/parity/delivery requirement remains OPEN.

The [native macro token draft](rust-macro-token-source-draft.md) retains the actual
upstream attached-bang lexer shape and adds a shared original-span source view
across macro readers, six selectors and the copied CST macro lane. Eleven
equations and independent unrun lexer/Unicode/mutation/core/callback/export source
are drafted. Every wider namespace/production/reverse/sync/parity row stays OPEN.

The [reverse primitive display draft](reverse-primitive-display-source-draft.md)
adds actual scalar String/toString checking and the matching canonical core
format macro inverse, retaining whole-source fresh reproduction and owned-text
loans. Five equations and independent unrun nine-caller JS/strict TS/native/source/
meta/refusal/export cases are drafted. Wider fixed-width reverse, formatting,
namespace/production/sync/freshness/parity/delivery requirements remain OPEN.

The [resource scalar integer draft](resource-integer-domains-source-draft.md)
shares all ten actual fixed-width scalar domains across original guards, source
constraints, literal bounds, operation signatures and native inverses. Seventeen
equations and unrun23-caller/JS/strict TS/width/guard/refusal/native/export cases
are drafted. Wider numeric container inputs/loops and every remaining namespace,
production/reverse/sync/freshness/parity/delivery requirement remain OPEN.

The [all-width container ingress draft](resource-container-domains-source-draft.md)
requires original success-constructor dominance and exact payload bounds against
the independently checked signature for all ten widths. Five equations and
independent unrun30-caller/JS/strict TS/native inverse/oracle/mutation/refusal/export
source are drafted. All wider loop/generic and unfinished namespace/production/
reverse/sync/freshness/parity/delivery requirements remain OPEN.

The [source expression block draft](source-expression-blocks-draft.md) checks real
zero-argument sync source invocations through the existing full body/capture
checker, emits child-return-safe native closures and retains text String emission
witnesses. Seven equations and independent unrun eight-caller paired/native,
three-forward-formatter/JS/strict TS/oracle/refusal/export source are drafted.
Mutable captures/borrowed outputs and every wider namespace/production/reverse/
sync/freshness/parity/delivery requirement remain OPEN.

The [all-width strict counter draft](resource-width-loops-source-draft.md) reuses
original strict range and counter-unassigned rules across all ten native widths.
Three equations and independent unrun30-caller/JS/strict TS/native inverse/oracle/
refusal/export source are drafted. More general counters/captures and every wider
namespace/production/reverse/sync/freshness/parity/delivery row remain OPEN.

The [checked text concatenation draft](source-text-concat-draft.md) adds actual
text-only plus and matching canonical two-slot native formatting, with preserved
operand order and owner loans. Five equations and independent unrun eight-paired/
four-forward/JS/strict TS/native inverse/oracle/refusal/export cases are drafted.
Generated modules/guards and every remaining namespace/production/reverse/sync/
freshness/parity/delivery requirement remain OPEN.

The [contextual text Into draft](contextual-text-into-source-draft.md) reuses the
existing native text allocation interface only for explicit owning destination
contexts. Two equations and independent unrun two-API/six-caller/context/refusal/
JS/strict TS/native/export cases are drafted. Ambiguous/callback/owning conversions
and every wider namespace/production/reverse/sync/parity/delivery row stay OPEN.

The [whole-module fixed ingress prefix draft](forward-fixed-guard-source-draft.md)
composes the actual existing Host type check with its adjacent authenticated
range helper across shared support and retained inverse API copies. Nine equations
and independent unrun ten-width paired/six-API/refusal/native/export source are
drafted. Full generated-module/resource/owned-text/namespace/production/freshness/
parity/receiving/delivery requirements remain OPEN.

The [whole-module owned formatting draft](forward-owned-format-source-draft.md)
adds a source-derived inverse API and explicit physical-source-unit registration,
with stable primitive argument substitution in the actual forward formatter.
Six whole equations and independent unrun paired thirteen-caller/source/order/
native/refusal/export cases are drafted. Physical-unit qualification and all
wider namespace/resource/carrier/production/freshness/parity/delivery rows remain OPEN.

The [mixed owned synchronization draft](owned-composite-source-draft.md) composes
literal and text-predicate rules with whole-module owned formatting/numeric/
control edits, retaining every adjacent source inverse and final whole-target
reproduction. Four equations and independent unrun mixed paired/physical-source/
strict TS/conflict/source/refusal cases are drafted. Complete source coverage,
receiving, namespace, regeneration, reverse freshness, parity and delivery remain OPEN.

The [explicit callback text target draft](callback-text-target-source-draft.md)
propagates original declared owning payload destinations through the existing
bounded callback source composer without granting type/trait authority. Six
whole equations and independent unrun four APIs/six callers/JS/strict TS/native/
wrapper/refusal/export sources are drafted. All wider closure/capture/namespace/
production/reverse/freshness/parity/receiving/delivery requirements remain OPEN.

The [explicit text branch destination draft](text-branch-target-source-draft.md)
propagates String source context through complete if/else and expression block
tails with exact terminal conversion positions. Three whole equations and
independent unrun two APIs/four callers/nine edits/JS/strict TS/native/refusal/
export source are drafted. Every wider control/namespace/production/reverse/sync/
freshness/parity/receiving/delivery requirement remains OPEN.

The [exact text constructor draft](text-constructor-source-draft.md) composes
closed String new/from source forms, actual borrowed arguments and chronological
local alias/method chains through the existing text core. Three equations and
independent unrun two APIs/six callers/seven edits/JS/strict TS/native/refusal/
export source are drafted. Wider constructor, owner/namespace, production,
reverse/sync/freshness/parity/receiving/delivery obligations remain OPEN.

The [closed String builder draft](text-builder-source-draft.md) adds whole
push_str/clear source proposals through existing text/format operations, retaining
receiver order, same-local reinitialization and complete unsupported-function
refusals. Three equations and independent unrun two APIs/five callers/nine edits/
JS/strict TS/native/refusal/export source are drafted. Wider suffixes/aliases/
capacity/owner closure, production, reverse/sync/freshness/parity/delivery remain OPEN.

The [literal character builder draft](text-builder-character-source-draft.md)
reuses the original Unicode scalar decoder and layered scalar/statement inverses
for literal String push. Two equations and independent unrun two APIs/seven
callers/JS/strict TS/native/scalar/refusal/export source are drafted. Character
variables, wider builder and all namespace/production/reverse/sync/freshness/
parity/receiving/delivery requirements remain OPEN.

The [consuming text core draft](text-consuming-source-draft.md) adds two paired
owned String operations and uses them in builder source assignments to retain
native buffer/capacity. Nine compiler equations plus separate complete native
CST construction and independent unrun runtime/JS/strict TS/ownership/canonical
inverse/native capacity/bounds/export sources are drafted. JS prefix validation
cost and original unbounded application equivalence remain OPEN, along with all
wider namespace/production/reverse/sync/freshness/parity/receiving/delivery rows.

The [chronological builder suffix draft](text-builder-alias-source-draft.md)
reuses the original lexical text alias reader for borrowed suffixes and initial
From values, retaining exact scopes and initializer evidence. Two equations and
independent unrun two APIs/five callers/six edits/JS/strict TS/native/refusal/
export source are drafted. Wider iteration/namespace/production/reverse/sync/
freshness/parity/receiving/delivery requirements remain OPEN.

The [whole-module consuming call inverse draft](consuming-text-call-source-draft.md)
rejoins actual emitted append/clear/allocation imports to complete current pinned
runtime/declaration/catalog source before qualified native proposals. Four compiler
equations plus three library equations and independent unrun whole/mixed paired/
physical-source/strict TS/owned-witness/refusal cases are drafted. Wider borrowing,
namespace/production/reverse/sync/freshness/parity/receiving/delivery remain OPEN.

The [generated declaration/header source draft](generated-header-source-draft.md)
adds complete nonfunction declaration units, actual native leading-header sites,
associated-member inspection and operation-local raw/owner sharing to both real
architecture expansion paths. Six equations and independent unrun real/synthetic/
lifecycle/source/native/refusal/export cases are drafted. Macro owner/hygiene,
attribute semantics, export/type-prefix closure and every production/translation/
sync/freshness/parity/receiving/delivery obligation remain OPEN and unqualified.

The [conditional generated builtin draft](generated-builtin-source-draft.md)
reissues actual parsed header receipts through the original normal/ungated native
lookup issuer and shares one complete source operation across both architecture
expansion paths. Six equations and independent unrun actual/private/lifecycle/
argument/refusal/real-x86/export source are drafted. Original caller grammar,
owner/hygiene/attribute effects/export/type-prefix closure and all wider
production/translation/sync/freshness/parity/receiving/delivery rows remain OPEN.

The [generated equality-header expression draft](generated-header-expression-source-draft.md)
retains actual native value/invocation inputs in both architecture expansion paths
with combined record/cell bounds and whole source/CST inverses. Six equations and
independent unrun source/native/lifecycle/refusal/export cases are drafted. Actual
macro owner/hygiene/expansion/effect/export/type-prefix closure and all wider
production/translation/sync/freshness/parity/receiving/delivery rows remain OPEN.

The [borrowed builder operand draft](text-builder-operands-source-draft.md)
composes original aliases, qualified core calls, shared owned-input views,
parentheses and complete borrowed conditional suffixes while keeping the builder
unknown. Four equations and independent unrun two-API/four-caller/five-edit/JS/
strict TS/native/refusal/export source are drafted. Wider mutation/iteration,
namespace/production/reverse/sync/freshness/parity/receiving/delivery remain OPEN.

The [builder method operand draft](text-builder-method-operands-source-draft.md)
reuses the original text substitution engine inside complete borrowed suffixes
and From arguments, retaining nested whole source/CST mappings/inverses and
combined per-function work bounds. Four equations and independent unrun two-API/
seven-caller/eight-edit JS/strict TS/native/refusal/export source are drafted.
Wider mutation/iteration/namespace/production/reverse/sync/freshness/parity/
receiving/delivery requirements remain OPEN.

The [primitive Display builder temporary draft](text-builder-display-source-draft.md)
reuses original primitive/core rules for explicit temporary format borrows,
retains all nested histories and supplies the matching whole emitted consuming
call inverse. Four equations and independent unrun two-adopter/twelve-caller/
twelve-edit/all-width/bool/JS/strict TS/paired inverse/native/refusal/export source
are drafted. Namespace/production/wider mutation/reverse/sync/freshness/parity/
receiving/delivery requirements remain OPEN.

The [complete else-if inverse draft](forward-else-if-source-draft.md) extends the
shared native branch reader across scalar/control/range/floating/owned paths and
normalizes only exact otherwise singleton-if comparison wrappers. Eleven complete
equations and independent unrun eight-API/two-language/truth-vector/native/source/
refusal/export cases are drafted. Wider language/namespace/production/translation/
sync/freshness/parity/receiving/delivery requirements remain OPEN.

The [closed match owning-text draft](match-text-target-source-draft.md) propagates
explicit String source context into complete nonbinding arm tails using reusable
closed pattern/arm bounds and original conversion rules. Four equations and
independent unrun two-API/six-caller/thirteen-edit JS/strict TS/native/scope/refusal/
export cases are drafted. Pattern binding/guard and all wider language/namespace/
production/reverse/sync/freshness/parity/receiving/delivery requirements remain OPEN.

The [explicit return owning-text draft](return-text-target-source-draft.md) reuses
shared balanced return bounds and existing expected target/conversion rules for
return-if/match/groups/early branches while keeping opaque callback targets
separate. Four equations and independent unrun two-API/five-caller/ten-edit JS/
strict TS/native/bounds/refusal/export source are drafted. Wider language/
namespace/production/reverse/sync/freshness/parity/receiving/delivery remain OPEN.

The [explicit carrier text target draft](carrier-text-target-source-draft.md)
reuses original written Option/Result roles and matching constructor payload
positions across branches/locals/returns/matches without inferred type or owner
permission. Five equations and independent unrun two-API/eight-caller/eleven-edit
JS/strict TS/native/bounds/refusal/export source are drafted. Wider generics/
namespace/production/reverse/sync/freshness/parity/receiving/delivery remain OPEN.

The [closed String append operator draft](text-builder-operators-source-draft.md)
reuses paired consuming append for complete += and local = local + borrowed
suffix statements with original scopes and nested source histories. Four equations
and independent unrun two-adopter/seven-caller/eight-edit JS/strict TS/paired
mutable inverse/native capacity/refusal/export source are drafted. Wider mutation/
namespace/production/reverse/sync/freshness/parity/receiving/delivery remain OPEN.

The [builder owning carrier return draft](text-builder-carrier-return-source-draft.md)
reuses exact written constructor/branch/return target positions for existing
String builders, retaining receiver escape refusal and a combined local work
budget. Three equations and independent unrun two-API/nine-caller/ten-edit JS/
strict TS/native/exclusive move/empty path/refusal/export source are drafted.
Wider mutation/namespace/production/reverse/sync/freshness/parity/receiving/delivery
requirements remain OPEN.

The [shared closed match local scope draft](closed-match-local-source-draft.md)
replaces blanket local-match refusal with a complete nonbinding source inventory,
activates all seven existing local readers for match-only scopes and distinguishes
or-pattern pipes from closures in text/integer/builder scans. Fifteen equations
and independent unrun paired APIs/actual callers/all-reader/JS/strict TS/native/
opaque/scope/refusal/export source are drafted. Wider pattern/namespace/production/
reverse/sync/freshness/parity/receiving/delivery requirements remain OPEN.

The [nested nonbinding pattern shape draft](nonbinding-pattern-shapes-source-draft.md)
extends one shared grammar for ignored constructors/tuples/records/slices/
references/ranges and nested alternatives across existing adopters and local
readers. Two equations and independent unrun paired actual Option/Result callers/
JS/strict TS/native/recursive scope/refusal/export source are drafted. Bindings/
guards and all wider namespace/production/reverse/sync/freshness/parity/receiving/
delivery requirements remain OPEN.

The [explicit paired scalar type core draft](fixed-type-core-source-draft.md)
adds twelve protected native aliases mapped through genuine current module/scope/
parser checks to existing fixed/bool/f64 meta types. Ten compiler equations and
complete two-file native template/root construction plus independent unrun all-
width/JS/strict TS/meta/paired inverse/native/refusal/export source are drafted.
Broad source adoption and namespace/production/reverse/sync/freshness/parity/
receiving/delivery requirements remain OPEN.

The [paired scalar type adoption source draft](fixed-type-adoption-source-draft.md)
adds complete source proposals for twelve bare scalar type domains to both bulk
adoption APIs, retaining protected native subtrees, fresh semantic checking and
whole inverses. Six equations and independent JS/strict TS/native/refusal/bulk/
fixed-point/export cases are SOURCE ONLY and UNRUN. Record/enum/local/generic/
namespace/production/reverse/sync/freshness/parity/receiving/delivery stay OPEN.

The [paired scalar declaration source draft](fixed-type-declarations-source-draft.md)
extends both adopters through one shared complete field/type selector for
monomorphic structs/tuples/enums/unions/aliases/statics. Four equations and
independent unrun two-API/fifteen-edit/atomic refusal/inverse/native/export cases
are source drafted. Generic/local/namespace/production/reverse/sync/freshness/
parity/receiving/performance/delivery requirements remain OPEN.

The [qualified scalar carrier source draft](fixed-type-carrier-source-draft.md)
shares exact lexical aliases across nested parameter/local and four carrier
method selectors. Eight equations and independent unrun paired APIs/eight
callers/JS/strict TS/native/refusal/inverse/export cases are source drafted.
Wider namespace/production/reverse/sync/freshness/parity/receiving/delivery stay OPEN.

The [lifetime-only scalar source draft](fixed-type-lifetimes-source-draft.md)
shares bounded original lifetime binders across signatures, declaration fields
and plain impl owners. Five equations and independent unrun paired APIs/ten
substitutions/native borrow/refusal/inverse/export cases are drafted. Type/const/
where/local/namespace/production/reverse/sync/freshness/parity/delivery stay OPEN.

The [lifetime owner grammar source draft](lifetime-owner-grammar-source-draft.md)
shares complete closed outlives predicates and explicit self receiver syntax
across both scalar adopters and declaration selectors. Five equations and
independent unrun paired APIs/nine substitutions/native/refusal/inverse/export
cases are drafted. Generic/local/namespace/production/reverse/sync/freshness/
parity/receiving/performance/delivery requirements remain OPEN.

The [explicit paired integer constant source draft](fixed-type-constants-source-draft.md)
shares genuine alias selection with exact MIN/MAX expressions through existing
checked integer domains. Four equations and independent unrun twenty-function/
JS/strict TS/whole and mixed inverse/native/refusal/export cases are drafted.
Broader namespace/production/reverse/sync/freshness/parity/receiving/delivery stay OPEN.

The [bare integer constant adoption source draft](fixed-constant-adoption-source-draft.md)
shares bounded closed body scope before qualifying MIN/MAX owner tokens in both
scalar adopters. Four equations and independent unrun forty-substitution/twenty-
caller/JS/strict TS/native/shadow/refusal/inverse/export cases are drafted. Partial
body refusals remain explicit; wider namespace/production/sync/parity/delivery stay OPEN.

The [explicit scalar local annotation source draft](fixed-local-type-adoption-source-draft.md)
reuses complete type grammar and actual lifetime binders within closed body scope.
Four equations and independent unrun sixty-substitution/twenty-caller/Bool/F64/
nested type/JS/strict TS/native/refusal/inverse/export cases are drafted. Partial
body refusals and wider namespace/production/sync/parity/delivery remain OPEN.

The [protected scalar alias endpoint source draft](fixed-type-alias-endpoint-source-draft.md)
retains every user alias scope guard while resolving its genuine qualified native
terminal through the shared scalar library. Three equations and independent unrun
all-domain/two-API/JS/strict TS/native/whole and mixed inverse/refusal/export cases
are drafted. Namespace/production/sync/freshness/parity/receiving/delivery stay OPEN.

The [owned Base64 Result input source draft](base64-result-input-source-draft.md)
replaces one explicit refusal across seven reverse lanes through shared native
input selection, snapshots, affine flow, TS/Rust emission, evaluator and canonical
inverse controls. Twenty-two equations and independent unrun all-lane/value/
observer/move/prefix/JS/strict TS/native/inverse/export cases are drafted. Wider
namespace/production/sync/freshness/parity/receiving/delivery remain OPEN.

The [TypeScript native source construction draft](native-typescript-copy-source-draft.md)
shares actual source-language selection across the existing native source-copy
constructor, lexical binding checks and CST histories. Four equations and unrun
JS/TS/MTS/CTS/Unicode/native-owner/inverse/export cases are drafted. Strict target
checks, namespace/production/sync/parity/receiving/delivery remain OPEN.

The [persistent native client source draft](native-client-persistent-source-draft.md)
adds actual paired Claude/Codex writers and conditional restoration through the
existing private transaction, plus a lossless TOML CST field editor and canonical
provider status. Nine source equations/four native implementation inputs and
independent unrun JS/strict TS/native/ownership/rollback/CST/export cases are
drafted. Remote/global undo/loopback/legacy catalog and wider native/translation/
sync/freshness/parity/receiving/delivery requirements remain OPEN.

The [persistent remote client source draft](native-client-remote-source-draft.md)
adds paired live scope selection, exact client token mint/reuse, catalog authority,
private persistence, remote revocation and setup rollback through existing bounded
HTTP transport and separate selected CA roots. Seven equations/four native inputs
and independent unrun JS/strict TS/native/export cases are drafted. Broader remote
health/discovery/managed parity, global undo/loopback/catalog and every wider
production translation/sync/freshness/receiving/delivery requirement remain OPEN.

The [machine scalar facade draft](machine-scalar-core-source-draft.md) adds actual
native Usize/Isize aliases and reuses existing 64-bit checked BigInt domains,
ordinary/source-bound type/declaration/local/carrier/constant rules, strict
source owners and explicit non-64-bit refusal. Five compiler equations plus
native template construction and independent unrun JS/strict TS/native/CST/
shadow/profile/export cases are drafted. Full production translation, broader
reverse/target matrices and every wider delivery requirement remain OPEN.

The [closed cast target draft](fixed-cast-type-source-draft.md) adds reusable bare
`as` type-position selection feeding existing guarded repository scalar/type
rules for thirteen target domains. Three source equations plus independent unrun
both-API/JS/strict TS/native/scope/Unicode/CST/inverse/export cases are drafted.
All wider namespace/production/reverse/sync/parity/receiving/delivery requirements
remain OPEN, with no current executable coverage claim.

The [remote health source draft](remote-client-health-source-draft.md) requires
bounded anonymous inference identity before remote scope selection/minting,
retains separate CA roots and ordinary management JSON contracts, and supplies
seven paired source equations plus independent unrun JS/strict-TS-transitive/
native/identity/status/origin/byte/deadline/export cases. All broader managed,
namespace/production/reverse/sync/parity/receiving/delivery requirements stay OPEN.

The [local const type draft](local-constant-type-source-draft.md) adds complete
initialized local declaration type selection through existing closed scalar
rules, keeps initializer producer checks and original hoisting/shadow boundaries,
and supplies three equations plus independent unrun both-API/JS/strict TS/native/
CST/inverse/export cases. No constant evaluator or executable admission is
replaced; all broader production/reverse/sync/parity/delivery requirements stay OPEN.

The [global configuration/undo draft](native-client-global-source-draft.md) adds
paired native operation dispatch, exact private backup/restoration/edit guards,
credential/catalog transactions, offline undo and all-client continuation through
eleven complete equations/three native inputs and independent unrun JS/strict
TS/native/CST/export cases. Local discovery/managed selection/global repair/
Codex bridges/temporary launch and every wider translation/delivery requirement
remain OPEN; complete source drafting and verification are not claimed.

The [Codex loopback source draft](native-codex-bridge-source-draft.md) adds paired
bounded HTTP/WS transport, private nonce-owned Node lifecycle, setup/configure
backend integration and removal/undo cleanup, with nine source equations/three
actual native/library inputs and independent unrun JS/transitive strict TS/native/
CST/export cases. Global repair, catalog/discovery/managed lifecycle and all wider
translation/parity/receiving/delivery requirements remain OPEN.

The [intact global backend repair draft](native-global-repair-source-draft.md)
retains the first exact undo backup/modes while advancing only verified managed
hashes, authenticates token/metadata association freshly and reuses current
credentials with post-repair rollback. Seven equations/three native inputs and
independent unrun JS/transitive strict TS/native/CST/export cases are drafted.
Broader managed repair/catalogue/discovery/lifecycle and all wider translation/
parity/receiving/delivery requirements stay OPEN.

The [Codex catalogue constraint draft](native-codex-catalog-source-draft.md) adds
bounded real-file/schema validation before minting/process startup and shared
lossless override removal inside exact global/repair transactions. Nine source
equations/three native inputs and independent unrun JS/transitive strict TS/
native/CST/export cases are drafted. Full native fresh-configure alignment,
wider migration/discovery/lifecycle and every broader translation/delivery
requirement remain OPEN; full source drafting and verification are not claimed.

The [explicit native source history draft](native-source-history.md) adds seven
compiler equations and two complete native Rust substitutions with immutable
originals, current inputs, both CST phases/full inverses and fresh rechecks rather
than bypassed source guards. Native Codex fresh-global validation/removal/undo and
8MiB reads now have implementation and independent unrun oracle source. Generic
histories grant no semantic/namespace/executable authority. Every broader source/
translation/parity/platform/receiving/delivery requirement remains OPEN.

The [native input provenance draft](native-input-provenance-draft.md) shares
bounded complete metadata/source reading across six constructors, retaining each
original pin and adding final complete metadata receipts after callbacks. Eight
source equations and independent filesystem-change cases remain UNRUN. This
adds no owner/semantic authority and closes no broader delivery requirement.

The [local Router discovery/configure draft](local-router-discovery-source-draft.md)
adds nine full source equations for paired JS/TS TCP/health discovery, lazy bounded
Docker listing and authenticated native managed references in actual configure.
Independent runtime/strict TS/native oracle source remains UNRUN. Node/Docker/
platform/crash and every wider translation/delivery requirement remain OPEN.

The [native discovery bounds draft](native-discovery-bounds-source-draft.md)
adds three full native substitutions and two compiler equations for lazy bounded
Docker listing, exact loopback TCP candidates and finite real-health probes.
Original metadata pins remain unchanged through five explicit complete histories.
All independent source cases and every wider delivery obligation remain OPEN.

The [integer BITS source draft](fixed-integer-bits-source-draft.md) adds twelve
integer associated constants with native u32 result types through the shared
ordinary/source-bound scalar adopter and genuine native-library parser. Three
source equations and independent JS/strict TS/native cases remain UNRUN; all
broader namespace/translation/reverse/sync/parity/delivery requirements remain OPEN.

The [native launch policy/argv draft](native-client-launch-plan-source-draft.md)
mechanically copies eight-client native inventories and launch mechanics into one
paired JS/TS source template and wires blocked-request preflight before core
construction. Seven complete equations and independent JS/strict TS/native cases
remain UNRUN. Actual temporary process/isolation/credential lifecycle stays OPEN.

The [owned temporary-client process draft](native-client-process-source-draft.md)
adds one paired bounded supervisor with exact argv/environment, cancellation,
owned-handle termination, independent streams and native exit statuses. Three
source equations and independent JS/strict TS cases remain UNRUN; actual temporary
with isolation/run-credential composition and broader requirements remain OPEN.

The [temporary-client profile/settings draft](native-client-profile-source-draft.md)
adds shared paired private profile lifetimes, Claude picker/model/privacy settings,
Codex process catalog/provider overlays and existing provider-codec integration.
Five equations and independent JS/strict TS/native source remain UNRUN. Actual
run-credential/process dispatch and every broader delivery requirement stay OPEN.

The [per-run credential/model/lease draft](native-run-credential-source-draft.md)
adds shared persistent/run remote preparation, exact model policy, narrowed picker
grants, bounded lease status transport and operation-owned cleanup. Seven complete
equations and independent JS/strict TS/native cases remain UNRUN. Actual temporary
process/bridge dispatch and every broader delivery requirement remain OPEN.

The [actual temporary with composition draft](native-client-launch-source-draft.md)
wires target/run grants/ephemeral bridge/private profile/argv/owned child into the
real paired dispatcher. Thirteen complete equations and independent fake-vendor/
strict TS cases remain UNRUN. Reset/migration/native environment/platform/terminal
and every broader compiler/parity/receiving/delivery requirement remain OPEN.
