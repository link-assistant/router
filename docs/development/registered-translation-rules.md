# Registered translation rule discovery and source composition

Implementation and independent case **source draft**. All new test, parser,
collector, source-rule, translator, receiving and runtime execution is UNRUN.
This does not establish complete translation or synchronization.

[`rule-registry.mjs`](../../tools/translation/rule-registry.mjs) adds reusable
registration, source inspection, prerequisite discovery and deterministic
composition over the unchanged `createRulePipeline`. Exactly `language`, then
`repository`, is accepted. Repository spelling never replaces semantic checks.

Registrations have own `id`, `phase` and synchronous `apply` fields. Optional
`discover(input, context)` inspects current input and returns a boolean without
thenable assimilation. Optional `requires`, `before`, `after`, `conflicts` and
`exclusive` are bounded lists. `requires` activates transitive prerequisites;
`before`/`after` only order already selected rules. All references must exist.
Required checking belongs in `requires`, not an optional ordering annotation.

```javascript
const registry = createRuleRegistry([
  {id: 'language:checked-body', phase: 'language', apply: checkWholeBody},
  {id: 'repository:package', phase: 'repository',
    requires: ['language:checked-body'], discover: needsPackage,
    apply: packageCheckedTarget},
]);
const result = registry.runDiscovered(originalInput, originalContext);
```

`compile(rootIds)` selects explicit roots; `discover(input, context)` inspects
current input and returns its pipeline; `runDiscovered` discovers and runs with
the same input/context. Definitions are copied at registration. No input/source/
owner/verdict/result cache is added. Metadata descriptions omit callbacks and
always retain false semantic authority. Source discovery is not private proof.

Missing references, cycles, phase reversal, conflicts on either rule and duplicate
exclusive labels refuse before `apply`. Ready rules retain registration order.
A minimum heap and the fixed phase boundary avoid repeated whole-list sorts and
quadratic phase-barrier edges. Bounds are4096 rules,32768 references/labels and
160-code-unit identities. Callback implementations retain their original private
checks and command deadlines; registry metadata cannot certify their termination.

The actual immutable scope collector uses this registry to discover its original
native-CST prerequisite from the selected repository reconciliation root. Both
original collectors still run with unchanged full phase/ID traces and refusals.

## Complete original-span source adoption

[`concrete-source-rule-registry.mjs`](../../tools/translation/concrete-source-rule-registry.mjs)
adds `plan` callbacks returning `{path, templates}` over frozen complete original
sources. Prior proposals remain frozen and accumulated. Language and repository
source-adoption sequences precede the independent semantic consumer; lexical
source is never an executable permit. `plan` selects explicit roots while
`planDiscovered` inspects the same frozen originals to discover them.

Templates retain original UTF16 coordinates, exact span text and literal or
original-span parts. The existing nested composer requires every child exactly
once inside a retained original reference. Crossing, duplicate, stale,
surrogate-cut or dropped edits refuse, without last-writer-wins behavior.

Combined edits pass the actual complete CST serialization/reparse/substitution
APIs. Full before/after/inverse and both CST documents remain. Registered-rule
and concrete-substitution traces stay distinct. No owner/type/caller issuer is
added. `applyConcreteSourceRulePlan` requires a complete original or final cohort,
validates retained histories and reissues current/new CST. Reapplication is a
no-op; stale/mixed/missing/duplicate/wrong-language cohorts refuse.
`restoreConcreteSourceRulePlan` performs the exact inverse and is also idempotent.
Original undo source remains separate from a no-op's current inverse. Changing
only source/hash/flags cannot validate altered retained CST. Plans stay DATA.

The additive domain is Rust/JS/TS,128 files, original template source/edit/nesting
bounds and existing16MiB/2-million-cell/depth160 DATA accounting. No old whole
project command, parser domain, pipeline or deadline is reduced. No writer,
installer, evaluator or persistent semantic cache is introduced. Every returned
source/namespace/semantic/runtime/installation authority field is false.

## Independent source evidence

- [Registry cases](../../tools/translation/test/rule-registry.test.mjs):
  transitive/source discovery, stable/optional order, absent references, cycles,
  phase reversal, conflicts, exclusive labels, mutation, fresh context/input,
  inherited-then behavior, exact errors and descriptor/proxy/array/bound refusals.
- [Concrete cases](../../tools/translation/test/concrete-source-rule-registry.test.mjs):
  complete Rust/JS/TS CST, nested cross-phase references, Unicode/CRLF, full
  inverses, both replay directions/idempotence, changed-meta/stale/mixed refusal,
  dropped/crossing/duplicate edits, discovery and unsafe callback payloads.
- [Actual Router receiving](../../tools/translation/test/registered-source-rules-router-20261103.test.mjs):
  discover over complete `openai_tools.rs`, compose a boolean-local body and
  nested input comment, retain the inverse, compile the genuine complete
  project/Cargo universe and receive emitted JS/TS in both reverse compilers.
  Independently written tool vectors and a single native predicate call remain
  expectations. Existing actual-module [Rust oracle source](../../rust/tests/borrowed_json_tool_predicate_20261103_test.rs)
  stays an independent gated-CI obligation.
- [Scope-driver cases](../../tools/translation/test/collected-scope-driver-20261103.test.mjs):
  original collector behavior, discovered prerequisites and complete traces.

All are UNRUN. This is JS compiler infrastructure; a fabricated Rust port of
the orchestrator is inapplicable. Actual application use still requires both
translation directions, strict TS, independent native behavior, private semantic
qualification, synchronization and receiving evidence. Other semantic families,
full inventory, coverage, export closure, verification and delivery remain open.

The complete adoption source archive retains both changed scope-driver/case
parents and five whole new registry/adapter/receiving sources under
`tools/translation/source-profiles/rule-registry-adoption-20261103/`. Its SHA is
a3a1f4ff2b68fd8fb31707f81682059184867ac55ba26bc9c6a1b67717758aa2.
`proposeRuleRegistryAdoptionSources` reconstructs both ordered source sequences
with complete before/after CST/inverses and whole created-source CST. The
independent source-ancestry case is also UNRUN. Source integrity is not a
private semantic receipt. No original compiler afterimage or source-index pin
was replaced for this additive adoption.
