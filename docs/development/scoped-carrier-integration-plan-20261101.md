# Scoped carrier / canonical reader consumer integration proposal

Historical worker handoff. Root subsequently authored the seven consumers and
fixed nine-stage integration described in the
[current source contract](scoped-carrier-adoption-20261101.md). The proposal's
implementation-status statements below describe its earlier handoff boundary;
they are retained instead of rewriting that history. Runtime/receiving,
production admission, semantic inverse and full translation remain unverified.

**READ-ONLY SOURCE PLAN / WIND-DOWN HANDOFF. No consumer below is implemented
and no source role is compiler permission.** The ready seven scoped-carrier plus three canonical
reader files remain frozen and unstaged. This document is separate from that
ten-file checkpoint. Sync owns its current opaque pipeline; do not edit those
files or committed parents to implement this plan.

## Current actual producer and consumer calls

Sync's current `opaque-production-adoption-20261101.mjs` imports four genuine
opaque stages and the captured local stage. Its view currently orders:
`output-owners`, `local-language`, `json-fields`, `primitive-option`,
`primitive-callback`, `text`, `local-option`. The first stage adopts the actual
three retained output owners; the local stages call the actual captured
`selectLocalClosureCandidates` and `selectLazyOptionCandidates`.

The four adopter copies retain these original selector calls and factories:

| Actual selector | Actual local-source construction |
| --- | --- |
| `selectJsonFieldAdoption` | `createJsonFieldLocalSource(tokens.slice(body+1,-1), parameterDomains, allParameters, {jsonNames})` |
| `selectPrimitiveOptionMethodAdoption` | `createPrimitiveCarrierLocalSource(tokens.slice(body+1,-1), parameterDomains, parameters, {opaqueRegions, readWrittenRole:tokens=>role(tokens,_scoped)})` |
| `selectPrimitiveOptionCallbackMethodAdoption` | The same carrier factory, with that selector's actual parameter/domain map and opaque regions |
| `selectTextMethodAdoption` | `createTextLocalArgumentSource(tokens.slice(body+1,-1), domains, parameters, {jsonNames:_scoped?.jsonNames??null, opaqueRegions})` |

Their results support `at(position)`, `evidence(name)` and `selectedCall(event)`;
JSON additionally reads `.names`. Carrier `at` returns decoded `{kind,domain}`
roles; JSON/text `at` use their original string domains. The new frozen helper
does **not** implement this interface: its `withScopedCarrierSource` callback
receives expiring `at`/`operand` readers returning immutable encoded role and
evidence DATA plus explicit lexical binder provenance, including unknown local
shadows. It exports no result-registration setter or semantic permit.

There are also guards before those factories: primitive Option/callback and
text selectors use a function-global `localNames` Set and reject an existing
parameter name or repeated local. JSON builds a global `shadowed` Set and
`watched` names. Their factory censuses ultimately call the same global alias
census. The chronological implementation already has block frames, but the
global censuses prevent repeated `key`/`used` names in distinct generated blocks
from reaching it. Do not delete all shadow checks or merely pass a Boolean
claiming the source is scoped.

Existing source rules must be reused rather than reimplemented:

- JSON `scalar(args)` already recognizes `Value::as_str/as_bool/as_u64` through
  actual scoped `jsonNames`, and inline scalar reader bodies. It already
  handles nonempty filters, empty default plus owning conversion, scalar
  literal defaults and owning text mapping where its source operands resolve.
- `readLocalAliasInitializer` already reads written annotations; the missing
  concrete cases were parenthesized text operands and block results, not
  annotation syntax itself.
- `selectIntegerMethodAdoption` already proposes primitive `.to_string()` as
  `crate::translation_core::format!("{}", operand)`, with its original trait /
  macro authority flags false. `proposeCallbackIntegerBodySource` exposes it
  to `proposeCallbackCoreBodySource` with full child source histories.
- The current finite Option selector already has filter/default/source-literal
  rules. Its block-prefix source role and borrowed-default allocation policy
  are separate gaps; no new Option runtime needs to be invented.

## Smallest semantic consumer work

Use one shared adapter and complete opt-in copies of the four selectors. This
preserves every original API and default-domain refusal. No Root, Host,
source-links, checked meta schema, native leaf, runtime or type hook is needed
for **candidate construction**. Actual whole-project checking remains the
only executable/type/loan/source-implementation admission path.

The proposed shared `scoped-carrier-adoption-20261101-locals.mjs` would provide
three fixed adapters for JSON, carrier and text families. Each adapter enters
the actual frozen `withScopedCarrierSource({source,functionSpan}, run)` around
one whole selector invocation, and closes the exact original source interval
and current invocation on every exit. It translates encoded role DATA to the
existing family's representations. These are source selectors, not callbacks
whose return truth can register into the real compiler.

Optional **DATA-only** adapter arguments may carry the original selector's
actual `parameterDomains`, `parameters`, module path, source header and scoped
alias names. They are derived inside the unchanged original header/module
guards, never submitted as owner/type proof. The adapter must rejoin name,
position, whole original header and actual source tokens before use. It may
fill an unresolved original parameter role only when the actual snapshot's
explicit `provenance[name].kind==='parameter'` rejoins that exact original
header declaration interval and name. The provenance must not be inferred
from null/absent role or evidence: an unknown local shadow also has null
evidence and is omitted from `bindings`, but remains explicit `kind:'local'`
provenance. Such a local must hide the old parameter role after its terminator.
Fixed recognized local roles take precedence. Unknown namespace aliases remain
residuals. These provenance records are immutable lexical DATA, never compiler
type/owner/capture certificates.

The adapter returns ordinary immutable per-position DATA. It does not expose
the source reader's frames or modify the frozen helper's exact input shape.
Every source lookup remains monotonic. Before using a role for an operand,
the new selector uses the actual operand-start position and full original
token interval. Sibling blocks, complete callback exclusions, patterns,
unknown producers and initializer-before-publication must retain the frozen
helper's actual guards and expiry. Callback locals never become outer locals.

The copied selectors would replace only the function-global duplicate/name
rejection at the actual scoped-selection sites, under this live source-DATA
operation. All declaration/header/type-role, cfg, macro, unknown producer,
library and dependency checks remain. JSON's global watched/shadow workaround
must become per-position source binding lookup; it cannot be bypassed by an
untrusted helper object or family flag. Unknown scopes refuse the new lane.
The original selectors remain byte-exact and independently callable.

For block receivers, add one common source-prefix branch to the copied carrier
selector's `expression(at,...)`: find the complete original `{...}` interval,
call `reader.operand(start,[start,end])`, and retain the entire block source as
the receiver. Existing Option method selection then processes the chain.
No evaluation, execution, type inference or guessed tail value occurs here.
The actual changed native program must later prove that the declared source
role agrees with its real Option owner/payload and all body effects/loans.

Do **not** add a public `selectedCall` setter to the frozen ledger. A candidate
from a previously unqualified initializer must not manufacture a concrete role
through arbitrary callback truth. Where a same-pass proposal would need such
an overlay, finish and close the whole-file source stage, install its actual
opaque-view update, then rebuild the graph/ledger from the concrete next
source version. A bounded source-only follow-up pass is permissible only as an
explicit new stage with all preimages/histories retained; it is not a cache or
compiler permit. Existing original setter behavior remains in old lanes.

## Required ordering and remaining source policies

The narrowest useful proposed new closed sequence is:

| Stage | Reason |
| --- | --- |
| Actual output-owner adoption | Retain Sync's complete original three-owner equations and all migration flags |
| Existing local-language | Remove the original direct local closure graph as explicit unqualified source candidates |
| New canonical-readers | Fold only the exact scope/revoked reader blocks before pattern/unknown-scope gates |
| Existing local-option | Form the actual captured/block-receiver two-arm candidates before their callback bodies are processed |
| New qualified-callback-bodies | Invoke the existing callback-core-body cascade on actual qualified callback intervals |
| Scoped JSON fields | Resolve typed/parenthesized block-local keys and reuse actual scalar function-item rules |
| Scoped primitive Option | Resolve complete block receivers/defaults using the now-concrete field source |
| Scoped primitive callback | Retain the original finite callback source rules and body cascade |
| Scoped text | Retain the original text/default/filter rules and full source guards |

The proposed reordering is a **new pipeline**, not a quiet change to the
current fixed view. If a bounded follow-up is needed, its actual sequence,
round count, stable-stop condition and all original refusals must be explicit.
Do not insert an unbounded retry or report a successful extracted function.

The new callback stage must select the actual existing qualified operation,
actual inline callback interval/arity and the original whole function/view
revision. Its temporary source-role map includes the actual callback parameter
roles plus all lexically resolved captures needed by that body. Call the
existing `proposeCallbackCoreBodySource(body, scope, {expectedOutput})`; keep
every full child source/CST/inverse and rebase only actual original body edits.
Temporary wrapper declarations remain explicitly non-authoritative. Enforce
the existing 64-binding/64KiB body/four-round limits; unknown captures or
overlapping/nested edits require a new source version or remain residuals.
The whole caller is still checked afresh. This should reuse the existing rpm
`v.to_string()` rule without granting general Display or changing libraries.

One policy decision remains before actual row success can be claimed:
`scope.filter(...).unwrap_or("client")` is borrowed in the original row, while
the existing qualified `str_unwrap_or` returns owning String. The old adopter
requires following `.to_owned/.to_string` and must retain that requirement in
its old lane. A new opt-in candidate rule may explicitly propose this borrowed
fallback → owning String allocation migration using the **existing** native /
JS/TS operation, recording old allocation/borrow/Drop equivalence false. The
fresh complete checker must prove actual String ownership, move/borrow roots
and format consumption. Do not pretend the existing contract returns borrowed
str or silently grant static lifetime. Otherwise retain this exact residual.

## Approved minimal consumer census and wind-down handoff

Root approved these **seven NEW consumer modules**, then assigned their
implementation back to Root during worker wind-down. **None of these seven
files has been created.** No guessed imports, partial implementation or stage
stub is present. The standalone helper/fold ten-file checkpoint remains frozen
at scoped archive `aa780178678afbdc163b70260b861a1d379ce8002f3a2bc7196b32ccb6f7aaae`;
its manifest lists the seven helper paths, plus the three canonical selector /
case / doc paths. Root will commit that checkpoint directly. This plan is a
separate handoff document, excluded from those ten files.

| Approved new path under `tools/translation/` | Remaining implementation |
| --- | --- |
| `scoped-carrier-adoption-20261101-locals.mjs` | Shared live readonly source-DATA adapter, provenance/header joins, role projections and unsupported-domain preflight |
| `scoped-carrier-adoption-20261101-json-selection.mjs` | Complete original JSON selector copy, scoped name checks/factory reads |
| `scoped-carrier-adoption-20261101-option-selection.mjs` | Complete original Option selector copy, scoped locals/block prefix and explicit owning fallback migration |
| `scoped-carrier-adoption-20261101-callback-selection.mjs` | Complete original callback selector copy, scoped locals and unchanged finite callback rules |
| `scoped-carrier-adoption-20261101-text-selection.mjs` | Complete original text selector copy, scoped locals and unchanged text rules |
| `scoped-carrier-adoption-20261101-canonical-readers.mjs` | New closed opaque source stage using the actual frozen canonical reader selector |
| `scoped-carrier-adoption-20261101-callback-bodies.mjs` | New closed opaque source stage joining actual qualified callbacks to the existing full callback-core-body cascade |

Root/Sync own the existing still-uncommitted opaque kernels, view and driver.
They should wire the four selector imports and two new stage imports there;
**do not clone those seven opaque modules again**. The former fourteen-module
fork proposal is superseded by this minimal integration. All originals and
old standalone/default APIs remain byte-exact. New complete source histories,
independent cases/docs and manifest are still required before any consumer
checkpoint. No native/runtime/Root/Host/checker hook is needed for source
candidate construction.

### Unsupported-domain preflight must precede helper entry

The frozen helper runs `ordinaryCensus` under `validate` /
`withSourceInputValidation`. Unsupported pattern/control syntax therefore
poisons the enclosing source operation if entered. New copied selectors must
perform pure syntactic domain preflight over the actual original tokens and
complete callback-region partition **before** calling the helper. Return an
ordinary skipped/residual function when the known unsupported grammar is
present. Never enter the helper, catch that poison, clear it and continue.

The preflight must account for nonordinary/mutable/reserved lets and original
`for`, `while`, `loop`, `match`, `fn`, `mod`, `use`, `extern`, macros, unsafe /
async / await / yield and `|` / `||` outside complete actual callback source
regions. Preserve ordinary pattern/control refusals and all original guards.
Malformed input, stale source, descriptor/getter/proxy mutation, changed
intervals, invalid native source or caught source validation failures remain
real failures and must propagate. Do not classify them by a message substring
or relabel them as a successful unsupported-function skip.

### Exact private view/result contract available to new stages

Sync supplied these actual exports from
`opaque-production-adoption-20261101-view.mjs`:

- `createOpaqueKernelResultStore`
- `assertOpaqueAdoptionView`
- `opaqueAdoptionRevision` / `assertOpaqueAdoptionRevision`
- `opaqueAdoptionEntry` / `opaqueAdoptionPaths` / `opaqueAdoptionSource` /
  `opaqueAdoptionCargo`

The new stages should propose these names for subsequent driver/view wiring:
`produceOpaqueCanonicalReaderStage` / `takeOpaqueCanonicalReaderResult`, and
`produceOpaqueQualifiedCallbackBodyStage` /
`takeOpaqueQualifiedCallbackBodyResult`. These exports are **not implemented**
yet. The fixed stage names are `canonical-readers` and
`qualified-callback-bodies`.

Each module must keep its own private result store and create it **lazily**:
view imports the takers while stages import view, so eager construction would
form an ESM initialization hazard. The actual store API is `issue(value)` /
`take(token)`, backed by a private one-use WeakMap using captured private state
operations. A producing kernel captures the exact view revision before the
fresh complete graph and source scope are built. It closes every actual
source/import/context guard and observer event, then asserts the original
revision again and issues frozen DATA shaped as:

```js
{
  view,
  stage,
  revision,
  updates: Object.freeze([{ path, before, after }]),
  summary,
}
```

`view`, stage and revision must be the actual current operation values, and
all update strings must be complete exact source pre/postimages. The view
consumes the corresponding genuine private take function; a separate public
store cannot register into that stage. It checks expected stage/revision
before changed-path preimages. Even an ordinary skip advances revision, so an
ahead-produced token cannot become valid later.

Actual source-event APIs are
`emitOpaqueSourcePair(view,{path,phase,before,after})` and
`emitOpaqueStructuredData(view,coordinate,value)`. A changed source pair must
produce `cstProduced===true`. Retain every full file, actual layered source
rule, serialized/reparsed CST, inverse, residual and module-graph diagnostic;
use the existing bounded event delivery rather than retaining a giant result.
Observer throws/invalid DATA/thenables/reentrance are sticky exact-primary
poison even if caught. A stage catch must never convert poison into a normal
residual or let an observer response authorize an update.

The canonical stage must retain the original opaque JSON global facade/leaf /
source-module/pub-edge/import/cfg/producer/dependency guards. The callback
stage must retain the original opaque callback family's corresponding complete
guards. Reuse those full implementations and actual Source inputs; do not
substitute public contract names/IDs as library authority. Preserve actual
private source expiry, both original/final whole-project checks and all actual
checker/ownership/source receipts. Qualified operation spelling remains source
selection DATA until that independent full checker reissues its proofs.

Do not freeze consumer history against the changing uncommitted opaque files.
After Root's coherent checkpoint, capture **every** complete original and
successor, including actual selector/factory/opaque consumer changes. Preserve
all original equations, before/after sources, CST, phase trace and inverses;
no ancestor archive overwrite, accepted-hash list, selector exception or old
installed fence may admit newer bytes.

## Receiving and limits remain obligations

Keep the actual opaque source issuer's 20k-path / 8MiB-file / 64MiB corpus
domain, field storage and current original CST/Cargo refusals. The frozen
scoped helper itself accepts 2MiB source; a larger file must retain a named
new-stage refusal, never be excerpted to make that helper pass. Preserve every
whole source and original residual. Retain each existing command, 60-second
case / 20-second child deadline and strict lockfile TypeScript5.9.3 check.
Complete source images, source tables, per-archive and 16MiB occurrence bounds
remain unchanged; aggregate CPU/RSS/throughput fit remains unqualified.

Actual receiving must check the complete original and complete adopted module
universes, all meta diagnostics and exact paired targets. Feed the independent
nine-vector row helper only the actual compiled whole-owner row using the
actual canonical JSON runtime; do not handwrite it or skip unsupported inputs.
Native baselines require the matching actual library overlay and same-SHA
eight-JS-gates scheduling. Edited-target semantic inverse through duplicated
closure bodies remains separate from physical source restoration.

No consumer, stage reordering, optional DATA adapter, allocation migration or
new receiving/native lane described here is implemented. Original closure,
standard owner, allocation/Drop/lifetime equivalence and production coverage
remain unproved. The approved seven-path scope still requires complete
implementation, source review and the coordinator's exact integration/commit
slot; this handoff itself supplies no additional semantic authority.
