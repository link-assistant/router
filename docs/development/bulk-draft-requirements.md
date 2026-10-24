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
| Common application operations | Formatting, text, numbers, JSON, Option/Result, vector readers and selected effects | Complete collection mutation, iterator/callback combinations, error propagation, state, HTTP, filesystem and streaming contracts with matching native abstractions. |
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

The last checkpoint before this phase is `0460fb741`: four complete
source-history receiving files passed 26 cases in Node and Bun. That historical
focused evidence does not qualify any change drafted in this phase or the full
translator. Existing failed attempts remain recorded.

The first implementation family in this phase is the
[filesystem effect draft](filesystem-effect-draft.md): twelve additional
synchronous/asynchronous operations, complete source-copy preparation, actual
forward parser/checker/runtime packaging bindings, a dedicated source-bound
reverse lane for direct/lazy wrappers, and independent JS/TS and Rust regression
source. The old eleven effect contracts and old runtime module remain intact.
These sources are drafted, not tested or qualified. Arbitrary reverse control
flow, other effect families, production caller adoption and all other open
rows above still need their complete draft; this family does not close them.

The [typed scalar frontend draft](typed-portable-draft.md) adds native-selected
TypeScript annotations, scalar/absence unions and alias chains to the existing reverse semantic
pipeline. It retains complete source inverses and compares the original written
parameter, return, constant and local constraints with independently checked
IR. The source and independent regressions are drafted but unrun. Scalar generic
alias substitution, defaults and constraints also have a complete source draft
and independent unrun regressions. Generic runtime functions, non-scalar generic
types, object, class, interface, async and other TypeScript obligations remain open;
there is no blanket type-erasure path or full-support claim.

Source review also found that the legacy checker refuses nullable parameters.
The [typed scalar absence draft](typed-scalar-absence-draft.md) now provides an
additive full checker/guard/translator/emitter/interpreter copy for those actual
domains. It preserves the old JavaScript refusal and adds complete source-bound
copy histories. The semantic implementation, edge cases and forged-guard
regressions are drafted but unrun. Annotation substitution alone is not counted
as executable support.

The TypeScript source draft also preserves explicit closed scalar parameter
defaults through the existing checked JavaScript pipeline. Initializer spans,
signature default presence, omission/undefined behavior and complete adjacent
alias/absence/default source histories have implementation and independent
regression source. Nothing in these families has been executed. Dependent or
effectful defaults, inferred parameter types and union defaults remain open.

The optional scalar source family now includes actual native call binding,
explicit undefined operands for omitted optional arguments, original question
spans and restored public TypeScript optional signatures. Required union
parameters remain required. Native return-colon selection replaces the earlier
character scan through comments. Complete current/prior source equations and
independent ABI, call order, trivia and refusal regressions are drafted and
unrun. General callable/object/class/async obligations remain open.

The [Rust normalization boundary draft](rust-scalar-boundaries-draft.md) adds
independent test source calling four actual production helpers. It covers
absence/foreign values, bit-exact f64 boundaries, strings, UTF8 byte limits and
controls. A collected f64 full-root regression now uses its complete current
original-source receipt while retaining the historical module and unchanged
function pins. Complete source/CST histories are retained; all behavior and
receiving checks remain unrun. Rust executes only in JS-gated CI. Changed Rust
source bytes require later bank/freshness refresh after bulk drafting.

The [canonical scalar Rust inverse draft](portable-rust-inverse-draft.md) adds
an actual Rust-to-checked-meta-to-JS/TS path for the existing emitter's closed
scalar normal form. Both decoded Rust meta and independently checked JavaScript
must freshly reproduce the complete Rust syntax. Portable synchronization
retains those full source equations and preserves original fallback refusals.
Its source, body-edit, nested-comment and behavioral regressions are unrun.
General Rust, generic/absence envelope inverses and full production sync remain
open. Separate source review also repaired missing Rust absence declarations in
identity-only output; complete source histories and new regressions are unrun.

Finite source-pattern substitutions also draft the canonical Rust absence
envelope inverse: constructors, strict tests, guarded projections, typeof and
truthiness reuse the checked absence IR and require both complete Rust
reemission checks. Actual helper source and all original implementation layers
remain present. Its independent regressions are unrun. Canonical scalar
Option/default prefixes, matching Some/None calls, mutable locals, while loops
and assignments also have source rules and independent unrun cases. General
ownership/generics and iterator loops still need their remaining implementation
draft; this does not close full synchronization.

The [paired TypeScript API draft](paired-typescript-api-draft.md) now preserves
accepted scalar alias spellings and optional/required choices after Rust
authority. Fresh paired source supplies formatting proposals only; the final
independently checked TypeScript must reproduce the complete authoritative Rust
syntax. Both native-selected source stages and final metadata histories remain
present. Independent consumer, invalid proposal and whole baseline/Rust-edit
integration regressions are drafted and unrun. Broader API forms and all other
open requirement rows remain unfinished.

The filesystem reverse source also contains ordered guarded Result flows and
closed lazy async flows. Every intermediate Result requires its original error
return before a successful payload can be consumed. These additional language
and runtime rules and their regression source remain unrun.

The [source-unit synchronization draft](source-unit-sync-draft.md) provides an
additive three-language proposal/apply path. It captures full current source
and Git baseline bytes, detects concurrent edits, invokes actual language/meta
translators, relocates native module edges and packages complete runtime assets.
Apply recomputes the whole proposal before writing; stored plans grant no source
or semantic permission. Its source and refusal/transaction regressions are
drafted and unrun. Full production profile coverage and the existing complete
Router synchronization/gate obligations remain open.
Compiler export, isolated and portable-Git source selection now share one
entrypoint list, including the additive unit synchronizer. Complete original
packaging sources, native-selected changes and two-sequence CST inverses are
retained by `prepare-unit-sync-exports.mjs`; its qualification and fixture
regeneration are deferred with all other verification.

The [pure module project draft](module-project-draft.md) links actual named and
namespace imports through fresh native source symbols, preserves module order
and complete CST inverses, then checks the entire linked body through the
existing semantic pipeline. Its source-unit profile also tracks dependency-only
edits and protects authoritative inputs from other unit outputs. Source and
independent regressions are drafted and unrun. The component scheduling draft
also covers function/type-only cycles with fresh native classification and
complete linked semantic checks. Cycles with runtime initialization, native
class/async module families and the broader forward namespace/producer closure
remain open.

The [Clone enclosing draft](clone-enclosing-draft.md) adds a separate private
namespace consumer over the complete existing source-backed Clone AST route.
It preserves field type checks, both resolver branches, original owner/helper
joins and all sibling obligations. A reusable native-selected source-copy
preparer retains complete originals, exact recipes and two-sequence CST
inverses. The implementation and regression source are unrun; this adds no
measured coverage or performance result and does not close the namespace row.

Rust syntax comparison also has a shared bounded token-cell source draft with
direct comparisons and native host guards. It removes repeated JSON encoding
inside helper matching without a new cross-invocation cache. Full prior code,
native-selected substitutions and both source inverses remain retained. This
source-review optimization and its regressions are unrun and unmeasured.

The [public module API draft](module-public-api-draft.md) selects actual native
named and star reexports, preserves JavaScript/TypeScript function identity,
retains scalar TypeScript type exports and emits closed Rust scalar aliases.
Mixed constant visibility, private Rust implementation packaging, full source
inverses and independent consumer/refusal regressions have source drafts.
Nothing has been executed. The [canonical Rust module inverse draft](portable-rust-module-inverse-draft.md)
also covers the complete emitted scalar envelope, including fresh inner checks,
public alias reconstruction and mandatory complete outer Rust reemission.
Generic public type constraints, paired multi-file API restoration and the
other module families remain open.

The [owned collection caller draft](owned-collections-draft.md) adds a separate
full private checker/emitter/document/paired-source copy for the existing owned
JSON map and filter-map operations. Actual native imports, full Rust/runtime
sources, callback domains, branch/loan checks, ordered emission and complete
source inverses remain required. JavaScript and TypeScript source frontends,
both interpreters, independent regressions and four actual native Rust oracle
cases are drafted and unrun. General collection mutation, iterator combinations,
effects, production adoption and whole-project synchronization remain open.

The [owned predicate/fold draft](owned-iteration-draft.md) adds matching native
and JavaScript filter, any/all, find and fold boundaries, a shared operation
description, generated declaration rules and complete root/asset source
histories. A separate five-implementation reverse copy carries predicates,
accumulators, owned Option<Json>, JS/TS source projection, emission and both
interpreters through checked meta. Independent caller, boundary/refusal and
native Rust oracle sources are drafted and unrun. The
[forward rule draft](forward-json-iteration-draft.md) also registers actual
qualified callers with coordinated private source issuance, callback domains,
whole-function ownership, lifetime analysis and guarded target imports.
Independent caller/refusal and source-history regressions are unrun. Standard
iterator adoption, nested combinations, general mutation/state and all other
open rows still need their complete implementation draft.

The [owned state draft](owned-state-draft.md) adds twelve matching Rust/JS core
operations for arrays, object updates and owned JSON vector bridges. A shared
catalog drives declarations and both translation directions. Actual native
source frames, original private issuance, whole-function ownership/layout
checks, guarded emission, five full reverse implementation copies and both
interpreters have source drafts. Complete original/CST successor histories
compose earlier producers. Independent runtime, ten actual Rust caller, JS/TS,
refusal and native oracle sources are unrun. General mutation/iterator adoption,
persistent state/concurrency, async/HTTP/streaming and all other open rows remain.

The [canonical owned Rust synchronization draft](owned-rust-sync-draft.md)
adds complete original Rust CST transport, catalog/control substitutions into
JS proposals and mandatory fresh checked whole-Rust reproduction. The
`owned-state` unit profile captures physical native/Cargo/runtime inputs,
preserves baseline conflicts and proposal/apply checks, and supports paired
signature proposals for edited JS. Complete successor source histories also
repair split JS/TS runtime binding and retain semantic metadata in packaging.
Independent inverse and multi-language synchronization regressions are drafted
and unrun. General Rust forms, production adoption and the other rows remain.

The [owned local flow draft](owned-state-flow-draft.md) adds source-bound lexical
owned JSON/vector assignments, branch continuation, surviving-path guard facts
and nested finite callbacks with independent private type contexts. Both
interpreters, JS/TS and Rust emission/inversion retain the same domains and
complete source histories. Independent behavior/refusal and native Rust oracle
source is unrun. Standard iterator/property mutation adoption, persistent
state/concurrency and every other open row still need their remaining draft.

The [runtime materialization draft](unit-runtime-materialization-draft.md)
provides separate fresh proposal/apply initialization of complete declared
JS/TS runtime, declaration and license assets. A complete copy of the original
source transaction retains its byte limits, source protection, atomic
installation and full inverse history. The existing CLI adds a runtime mode;
no application translation or Rust execution is implied. Independent source
and all receiving/export qualification checks remain unrun.

The [automatic JSON iterator adoption draft](json-iteration-adoption-draft.md)
copies the complete existing map/filter-map adopter and packet CLI, then adds
source-selected filter/any/all/owned-find/fold terminals with actual library,
scope, producer, Cargo, CST and inverse joins. Block/expression callbacks and
standard collect syntax have source rules. All proposals remain candidate-only;
independent fresh caller and standard-native oracle regression source is unrun.
Production adoption/application qualification and the broader open rows remain.

The [checked iterator installation draft](checked-iteration-adoption-draft.md)
recomputes actual source proposals, retains selected whole-function CST
equations and requires every selected replacement body to freshly pass the
existing private project checker/meta/JS/TS pipeline. Apply recomputes the full
proposal against physical source, package/workspace Cargo and Git inputs before
the existing transaction. Complete source/target review and inverses are
retained. Independent cases are unrun; original trait dispatch, native parity,
production adoption and all remaining requirement rows stay open.

The [JSON field/Option draft](json-fields-draft.md) adds six matching native and
canonical-runtime field/index readers, actual source/import/private checking,
typed Options and loans, numeric guard/construction rules, both interpreters and
JS/TS/Rust emission/inversion. Complete native root and nine source-copy
successors retain original bytes and both CST rule sequences. Independent
runtime, source/target/refusal and native oracle sources are unrun. General
Option/Result, effects/state, adoption and every other open row remain.

The [typed field-reader adoption draft](json-field-adoption-draft.md) adds
automatic source-selected field/scalar chains, named lifetime handling, bounded
packet production and fresh checked selected installation. Three complete
original source producers, their refusal scopes and full CST inverses remain
retained. All independent caller, packet, installation and refusal regression
sources are unrun. Production application and the broader open rows remain.

The [signed numeric and map ABI draft](owned-numeric-abi-draft.md) adds actual
operation-derived signed/map interfaces, bounded negative literals, numeric
Option constructors and contextual literal returns to the owned-state path.
Canonical Rust inversion and source-unit signature proposals use the same
domains. Seven complete source successors, full CST inverses and independent
JS/TS/native oracle sources are drafted and unrun. Broader arithmetic, complete
production application and every other open requirement row still need work.

The [owned Option/Result draft](owned-outcome-draft.md) copies the complete
owned-state checker/issuer/meta/emitter and canonical inverse into a separate
profile. Nine matching native/runtime operations, source-bound carrier inputs,
constructors, conversions, fallbacks, guarded payloads and reassignment facts
have implementation and independent unrun regression source. Nine complete
source originals and full CST successors retain both ordered sequences.
Standard native caller adoption/forward lowering, source-unit integration,
generic carriers and the other open rows still require source drafting.

The [owned carrier source-unit draft](owned-outcome-unit-draft.md) connects the
new private profile to actual JS/TS/Rust authority selection, checked paired
signature proposals and complete runtime materialization. Nine complete source
successors compose the original transaction/history producers. Independent
three-direction, conflict, stale-input and installation cases are drafted and
unrun. Native standard-source adoption, full forward project lowering and the
other open rows still require their remaining source draft.

The [forward field/carrier draft](owned-forward-draft.md) adds qualified native
caller parser, type/ownership, optional loan, owned carrier flow and runtime
packaging rules through the existing whole-function private issuer. Nine full
source successors and independent actual Rust caller/strict target/refusal cases
are drafted and unrun. Production application, namespace/producer closure,
generic flows, effects, CI/freshness and the other ledger rows remain open.

The [automatic owned carrier adoption draft](owned-carrier-adoption-draft.md)
adds source-selected Option/Result fallback/conversion rules, a bounded packet
sequence and fresh checked selected installation through three complete source
copies. Independent actual caller, strict target, refusal, packet and application
cases are drafted and unrun. Production application, broader forms, original
dispatch/Drop equivalence and the other open requirements still need work.

The [canonical JSON loop draft](owned-json-loop-draft.md) adds actual immutable
list for-of bindings, lexical scopes, owned assignments, nested/empty loops and
real return completions to the owned profile, both interpreters and target
emitters. A complete Rust reader copy and mandatory inverse reproduction retain
all resource guards. Seven complete source successors and independent unrun
JS/TS/native/refusal sources are present. Standard forward/adoption loop forms,
broader control/effects and the other open rows remain unfinished.

The [standard JSON loop adoption draft](json-loop-adoption-draft.md) converts
closed actual slice/accumulator loops into the existing owned fold interface,
with complete clone/initializer/update source substitutions. Three full source
copies retain packet generation, fresh selected whole-function checking and
guarded installation. Independent actual caller and refusal sources are unrun.
Production application, general loops/control/effects and the other requirement
rows remain unfinished.

The [conditional filesystem draft](filesystem-control-draft.md) adds native
Boolean branches, exclusive payload usage, deferred async control, complete
canonical Rust authority and physical three-language unit synchronization.
Seven full source successors and independent JS/TS/native oracle, ordering,
conflict and refusal regression sources are drafted and unrun. Broader effects,
production application and every remaining requirement row still need work.

The [generic enum namespace draft](generic-enum-namespace-draft.md) replaces a
blanket generic enum refusal in the enclosing resolver with bounded original
header selection and retained native resolver recipes. The original scope
issuer, configuration/visibility and all independent semantic obligations stay
required. Two complete source successors plus independent namespace/refusal and
native oracle sources are drafted and unrun. This is no coverage measurement;
the broader namespace/producer and production application work remains open.

The [owned loop-control draft](owned-control-draft.md) adds actual while,
break/continue and mutable scalar control to the owned profile, both independent
interpreters and canonical Rust inverse. Entry/exit facts are conservative across
all iterations. Six complete source successors and independent JS/TS/native,
completion, loan and refusal regression sources are drafted and unrun. General
arithmetic, application data/effects and all remaining rows still need work.

The [fixed-width integer draft](owned-integer-draft.md) adds thirty native/runtime
interfaces, operand-derived literal widths, numeric Options, actual forward
caller rules, canonical inverse and existing three-language source-unit support.
Eight complete source successors, full native root histories and independent
boundary, JS/TS/interpreter, source-unit, refusal and native oracle sources are
drafted and unrun. Standard method adoption, production application and all
remaining requirement rows are still open.

The [byte-safe streaming draft](owned-sse-draft.md) adds an explicit shared
interface over the complete original native SSE framer, preserving pending bytes
and source-bound locked dependencies through both directions and physical units.
Eight full code predecessors, native root histories and independent every-byte,
JS/TS/interpreter, forward caller, unit, refusal and native oracle sources are
drafted and unrun. HTTP, cancellation/backpressure, protocol business state,
production adoption and all other remaining requirement rows are still open.

The [complete-module ordinary call draft](owned-local-calls-draft.md) adds
native-symbol-bound acyclic helper calls, callback calls, loan propagation and
complete checked callee closure to both interpreters, meta and canonical inverse.
Five complete source successors plus independent JS/TS/native, missing/forged
callee, recursion and ownership regression sources are drafted and unrun.
Cross-module calls, declared recursion, async/generic application logic and every
other remaining requirement row are still open.

The [primitive method adoption draft](integer-method-adoption-draft.md) copies
three complete adopter/packet/installer implementations for actual i64/u64
method receivers and closed operands. Native parameter/producer scope, complete
source inverses and fresh selected whole-function checks remain required.
Independent actual caller, strict target, packet, application and refusal source
is drafted and unrun. Production application, broader inference and all other
remaining requirement rows are still open.
