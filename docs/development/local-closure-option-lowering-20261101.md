# Local immutable closure and lazy Option source-lowering proposal

**Proposal only; no implementation, execution or new permission.** This document
describes a successor to the frozen `json-scalar-readers-20261101` candidate:
148 parent plus 22 new complete source versions, delta
`8a6de0143294b737f6e52f8ec01b513379810d32366a66eebf4a9a92352d8388`.
It does not alter that candidate, its seven virtual substitutions, its cases,
its archive, any physical compiler source or existing entrypoint domain.

The subsequent [candidate-only source producer](local-closure-option-candidate-20261101.md)
drafts explicit unqualified migration equations, including lexical shared-root
captures. Original lexical provenance can select such candidates before a
typed original closure issuer exists. The separate actual whole-candidate
checker owns admission; original typed capture/closure/standard equivalence
remains false. The issuer requirements below apply to a future claim of those
original semantics, not to merely authoring a clearly labelled candidate.

## Actual owner and remaining work

The complete actual `rust/src/token_report.rs` defines three local closures in
`row`, in this order:

| Binding | Written arguments | Actual source dependencies |
| --- | --- | --- |
| `text` | `key: &str` | shared `record`; `get`, `Value::as_str`, default and owning conversion |
| `number` | `key: &str` | shared `record`; `get`, `Value::as_u64` |
| `used_over_max` | `used: &str, max: &str` | earlier local `number`; a shadowing local `used` value; lazy two-arm owned formatting |

`used_over_max` reads the used count once, then reads the maximum once. The
Some arm formats `used/max`; the None arm formats `used/-`. Separately, `rpm`
uses `number("rate_limit_per_minute").map_or_else` with a literal default and
`v.to_string()` in the Some arm. The returned row also contains direct local
closure calls, primitive Option defaults, scope filtering, actual expanded
if-let reader blocks, named format captures and width formatting.

These are original local closure values, not module functions or already
qualified inline core callbacks. Scalar receipts alone do not admit them.
`print_table` additionally retains original `println!`, HEADERS indexing and
multi-output iteration. Its output adoption and the separately owned constant
index formatter prerequisite are not supplied by this proposal. Preserve the
whole lib/module graph, actual serde import, attributes, inline test module and
all source before/after images when making a later row proposal; never promote
an extracted rewritten row to whole-owner coverage.

## Existing reusable checks and their boundary

`primitive-option-callback-forward-domain.mjs` exports
`checkForwardPrimitiveOptionCallback`. It requires the actual qualified call,
an inline fixed-arity `routerLambda`, real receiver carrier, primitive or
owning String identities, callback result and original source-checker birth.
It calls `checker.hostLambda` with the actual environment and callback result.
`HostChecker.hostLambda` in `extensions/host-contracts.mjs` delegates inline
syntax to `IteratorChecker.lambda` in `extensions/iterators.mjs`. That lambda
checks written argument types, constant-pattern conflicts, whole body and
expected result, then uses checked lets and `routerLambdaInput` for parameters.
`ControlChecker.callbackEnvironment` supplies an independent return/loop
boundary and removes captured mutation permission. These are useful genuine
checks; none supplies a private receipt for a stored local closure binding.

`local-alias-binding-source.mjs` and `inline-closure-source-tokens.mjs` provide
bounded lexical census/closure grammar DATA. The latter explicitly leaves
body, type and captures unchecked. Existing
`primitive-option-callback-method-adoption-selection.mjs` selects a finite set
of Option methods and inline callbacks; its method set lacks `map_or_else`.
`callback-core-body-source.mjs` composes complete bounded child proposals and
keeps their complete histories, while explicitly leaving function-owner and
semantic authority false. Qualified function-item helpers preserve a source
path but do not issue local closure binding authority.

The actual private foundation remains `router-core-json-updates.mjs`:
`functions`, `activeFunctions`, `checkedCalls`, `issued`,
`completedFunctions`, `currentFunction`, `projectionRecord`, `checkedState`
and the genuine checked whole-program source context. The scalar sibling uses
those actual records plus original parser/source intervals, full library
identity and whole-flow closing. A new language layer must join these checks;
neither a closure name nor a public catalog row is a substitute.

## Reusable language substitution first

The smallest proposed language domain is a nonescaping immutable local closure
graph with direct calls in the same complete function. It permits no closure
value ABI, heap closure object, dynamic dispatch or higher-order application
interface. Candidate selection can use source grammar DATA, but admission
requires a new private operation-owned binding issuer with all these joins:

1. The actual original declaration evidence and current function receipt;
   parser, source module view, original let/lambda/call object membership and
   exact intervals; unmodified whole declaration and namespace snapshots.
2. Lexical declaration order, shadowing and scope derived from the original
   parser/checker environment. Resolve each call to exactly one earlier live
   binding object. The local `used` inside `used_over_max` must not refer to its
   parameter after the let. A module item, same-name closure, alias or public
   source key cannot redirect this lookup.
3. Every closure reference in the whole original owner is either its declared
   binding or an exact direct invocation. Return, assignment, storage in an
   aggregate, passing as a callback/function value, borrowing the closure,
   address observation and unknown use refuse. Later closures may depend on
   earlier proven bindings; forward dependencies, cycles and recursion refuse.
4. Derive free-variable capture identities from actual binding resolution,
   not identifier spelling. Rejoin their checked types, ownership and live
   loan roots. Initially permit only actual immutable Copy primitives and
   shared, nonescaping references to proven original roots. Refuse owning
   String/Json captures, mutable references/interior mutation, move captures,
   custom Drop, unknown traits, async and any constructor/capture side effect.
5. Type-check each actual body with the original checker lambda/body rules in
   its original lexical environment, with resolved written arguments and
   genuine expected return from its call context. Repeated uses must agree on
   that checked signature and capture set. Untyped syntax or source role
   inference cannot invent a closure return/capture type.
6. Rejoin the complete current parent function, body/signature/namespace,
   actual project/checker identity and closure dependency graph before any
   admission, emission and final closing. Check every original use; publication
   waits for whole-function flow and whole-program checking.

This issuer is a required new private API, not an existing capability. A
plausible implementation point is a complete copied Root successor at
`visitRouterCoreJsonUpdateFunction`, where the actual item/receipt/entry and
current function are joined. Capture original raw local binding and invocation
membership there, then bind an operation-local helper to the actual checker
`let`/direct-call visits. Any new `ControlChecker.expr`/`HostChecker.expr` hook
must be separately source-reviewed: the current seven approved scalar paths
do not authorize changing those modules. The hook must supply actual current
environment and typed body to this exact private singleton; arbitrary callback
truth or a separately constructed factory cannot register a proof.

For complete original bodies that still contain unqualified std operations,
the existing checker may refuse before such an original typed closure proof
can be issued. Do not fake one. A source-only lexical expansion remains a
candidate equation in that case. Repository adoption may produce a separately
checked qualified owned-domain function, with original std/trait equivalence
explicitly false. If exact original equivalence is required, its missing
standard-owner/body proof remains a prerequisite.

The language source transformation alpha-renames only proven bound references,
not strings, comments, fields, type names or unrelated same-name locals. At
each call it emits fresh hygienic block lets for **all** actual arguments in
written left-to-right order, even unused ones, then instantiates the proven
body once. It must preserve evaluation/panic order, argument borrows and
temporary cleanup. Delete a declaration only after proving construction and
destruction are unobservable within this narrow capture domain and every use
has been accounted for. No textual global replacement or synthetic original
source span is acceptable. Generated source is reparsed and checked afresh;
original provenance remains the actual original intervals plus full equations.

## Lazy two-arm Option lowering

No new runtime operation is necessarily needed for the initial
`Option<u64> -> String` domain. Existing native and target counterparts provide
`u64_to_text_owned_map` and `text_owned_unwrap_or_else`. A proposed source
composition for a separately checked qualified operand is:

```rust
crate::translation_primitive_option_callbacks_core::text_owned_unwrap_or_else(
    crate::translation_primitive_option_callbacks_core::u64_to_text_owned_map(
        receiver,
        |max| crate::translation_core::format!("{used}/{max}"),
    ),
    || crate::translation_core::format!("{used}/-"),
)
```

This is a candidate mapping, not proof of original `Option::map_or_else` owner
or standard ABI. The receiver must be evaluated once before either branch.
Some executes the mapper exactly once and never evaluates the default body;
None executes only the default body. The existing core wrappers check actual
String bounds and return real owning String. Preserve their bounds and
destruction/loan rules, with no literal no-Drop grant.

Original method-call evaluation constructs the default closure before the
mapper; this nesting constructs the mapper before the fallback closure. The
proposed narrow domain therefore requires a private proof that both closure
constructions capture only already-live immutable Copy/shared values without
observable construction/destruction or escaping/reborrow conflicts. Even then,
closing must check the lifetime change introduced by nested callbacks. If
that proof cannot be made for a caller, refuse this composition; a separately
specified two-callback native/JS/TS operation with original construction order
would require another reviewed library contract and whole source successor.

Do not evaluate either body early to produce a fallback String. Do not emulate
the two arms using eager `unwrap_or`, evaluate the receiver twice, silently
change allocation failure behavior, or accept any callback because a descriptor
says it is pure. Within the explicit owned migration, primitive formatter
allocation and core text bounds must match both native and targets; additional
intermediate Option<String>/validation behavior is recorded, not claimed to be
general original standard-method equivalence. Custom Display stays refused.

## Repository adoption and complete histories

After the reusable language pass, repository rules may use the existing actual
field, primitive Option, finite callback and primitive text producers. Retain
their real source/module/import/self-alias/constant dependencies and all skips.
The actual `Value::as_*` function items require qualified source-backed owned
replacement or genuine original standard ownership; their spelling alone
does not prove either. The actual expanded scope/revoked if-let blocks and
scope nonempty/default composition need their own successful original or
qualified checking; local closure support must not silently admit patterns.

Every changed whole file must pass separately declared ordered language then
repository rules through serialized/reparsed CST. Retain full physical
original, intermediate and adopted sources, complete inverses, original spans,
every semantic admission/refusal meta and actual rule trace. Source relocation
maps are DATA for genuine origin matching; they never become type permission.
The final complete module universe is checked through the existing scalar170
frames, with all private lifetime/flow/namespace/source closing retained.

A later profile must resolve the entire immutable 170-version parent plus a
bounded new delta. Preserve every older source stage, addition, raw resource
and source-module prerequisite under fresh exact-byte/identity closing. Use
explicit parent/delta indices, original per-archive/source limits, table256 and
16 MiB occurrence accounting. If the complete new history cannot fit, report
the real storage/scaling blocker; do not discard parent versions or raise caps.
No frozen scalar bytes, archive or old installed fence may be reused as an
authority for newer after bytes.

Both complete emitted JavaScript and strict TypeScript must be checked and
executed independently later. Edited-target inverse needs actual formatter
literal/call provenance, fresh complete changed native rechecking and exact
reproduction of both target outputs. Mapping an edit back through duplicated
closure instantiation to one original definition is a separate requirement:
prove a unique consistent original edit, re-expand all uses and recheck the
whole original/adopted owner, or refuse. Physical source restoration alone is
not semantic reverse translation.

## Future independent source cases; all UNRUN

- Full actual `token_report.rs` and original lib/dependency graph; row outcomes
  for missing/null/wrong-kind/scalar fields, u64 above 2^53/max, Unicode, empty
  scope, revoked default, None/Some rpm and both maximum branches. Keep all
  original residuals until genuine complete checks admit them.
- Unused, repeated and shadowed arguments with distinct panicking operands;
  left-to-right once-only evaluation, stable capture at declaration/call,
  nested immutable closures, repeated calls, scope exit and a later shadowing
  local. Independent native baselines must use actual full original owners.
- None with a panicking mapper and Some with a panicking default; each selected
  branch once, exact earlier effect before later panic, core text/Unicode/byte
  boundaries, owned String/Option payload moves and cleanup.
- Escaping closure, closure alias/assignment/aggregate, recursive/forward
  dependency, mutable or owning capture, custom Drop, unknown effect/trait,
  async, pattern binder and borrowed result escape refusals.
- Original same-name ambiguity, changed capture namespace/type/loan, stale
  whole lambda/body/signature, forged public descriptor/factory and expired
  operation; caught source failure plus restoration still poisons, with every
  closer attempted and exact falsy/frozen primary preserved.
- Real receiving original/installed source pairs, CST/meta round trips,
  lockfile strict TypeScript5.9.3 diagnostics, edited literals/calls and
  conflicting edits across duplicated closure uses. Native source runs only
  through a matching new overlay after all eight same-SHA JavaScript gates.

No proposed hook, new closure issuer, two-arm lowering, caller qualification,
new runtime, native oracle scheduling or production coverage is implemented by
this document. Obtain a separate exact virtual-path/source review before code.
