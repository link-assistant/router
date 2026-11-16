# Eager scalar map/filter collection lowering — source draft

`tools/translation/collection-callback-bulk-20261101.mjs` implements actual new
source lowering for explicitly selected JavaScript/TypeScript collection locals:

```javascript
const values = input.map(item => item + 2n);
const selected = input.filter(item => item > 1n);
```

Each initializer lowers into an empty collection and an eager `for..of` loop;
map pushes the checked scalar expression, filter checks its Boolean predicate
and pushes the original scalar. The example selections must be in independent
functions: the strict lane requires each receiver to remain an unused original
function input before the selected statement. Callbacks run in input order,
once for each visited scalar, with no fusion or retained iterator object.

`proposeCollectionCallbackBulk(data, {family, modules})` accepts the existing
complete `outcome`/`cancellation` source profiles with `primitiveOperators: true`.
A module has `sourcePath`, fresh `rustPath` and `callbacks`, each selection
`{function, local, domain}`. At most 16 modules/128 callbacks per module are
allowed. Sources, manifests, native cores and runtime/type dependencies remain
complete original inputs; no runtime function or public spelling is a permit.

The native syntax selector requires one ordinary top-level function, one
top-level single const declaration, an original input parameter receiver, and
one synchronous expression arrow with one inferred identifier parameter.
Expressions admit only that scalar identifier, numeric/Boolean literals,
parentheses, listed arithmetic/comparison/logical/bitwise operators and
conditionals. Captures, function calls, writes, blocks, property/index access,
this, references, suspension, index/array callback parameters, thisArg, optional
calls and chains remain refused. A finite whole-module node/depth census and
native compiler identity checks bound and close syntax selection.

The shared `scalar-chain-bulk-20261101-expression.mjs` planner lowers arithmetic,
complement and shifts to genuine existing `integerArithmetic`, `primitiveNot`
and `integerShift` calls, with hygienic actual imports. It also routes eager
bitwise operations through `primitiveBitwise`. Raw arithmetic is not passed to
an owned source checker that does not admit it. Written parameter syntax supplies
an input-domain candidate separately from the selected output domain. Thus a
u64 comparison can map into bool, and a bool conditional can map into u64.
Those syntax candidates grant no type identity; the complete actual checker
reissues every input operand, result, import and literal width. Dynamic Number
literals and unary coercion are refused. Complete immutable before/after source
equations for this source repair are retained in the new chain source profile.

The actual language substitution runs on complete serialized/reparsed CST,
retains original spans and callback source, and composes the resulting complete
module into the existing literal/vector-loop automation. That compiler performs
all actual source binding, shared primitive input typing, scalar expression and
Boolean checks, copy/ownership/move/loop checks, runtime dependency admission and
semantic-meta reissue. A requested domain never establishes an input or result
type. Wrong-width, coercing and non-Boolean predicates still fail there.

Both original JS and written TS have the same lowering. The complete resulting
Rust is reproduced from the actual canonical Rust inverse, then reissued through
the JS concrete-meta entrypoint; independently emitted written TS must reproduce
the whole Rust syntax as well. Arbitrary authored Rust callback chains are not
newly accepted by that canonical inverse. The standard-library Rust oracle
`rust/tests/collection_callback_bulk_20261101.rs` expresses independent
map/filter expectations; it is not a new source authority. Cargo CI discovers
this test source through the existing Rust gate after all same-SHA JavaScript
stages succeed. No Rust command was invoked during drafting.

Repository output retains the original-to-loop, loop-to-core and complete
original-to-core source equations with exact full inverses. Canonical Rust and
JS/TS artifacts remain separately named from the edited application proposal.
Every returned field, including duplicated nested bulk/module/history/program
data, passes complete occurrence accounting before return: separate 16 MiB
UTF16-unit/UTF8-byte caps, 2,000,000 cells and depth 160. Aliases count on every
path. Every original context closes on success/failure and primary failures stay
primary. Nothing installs files or caches source/owner/result facts.

This is an explicit input-contract migration. It does not prove that the
original `.map`/`.filter` property owner was the standard Array intrinsic.
Sparse arrays, accessors/proxies, species, mutation, ordinary Number coercion
and unbounded arrays are not the target's primitive shared-slice domain.
Original method-owner and original-body-equivalence flags remain false. The
4,096-value and primitive bounds remain unchanged; no new native ABI is added.

No shared dispatch/preparer integration is required for this standalone proposal
API: import the new function with complete source data. Automatic discovery,
export closure, wider lazy adapters, captures and
reference callbacks, platform/production adoption, full synchronization and
runtime parity remain open. The new independently authored cases cover actual
map/filter behavior, bool/u64, typed and JS sources, old-lane refusal, inverse
histories, full capacity, illegal callbacks/types and late transaction failure.

All parser/compiler/translator/preparer/interpreter/test/native execution is
**UNRUN**. No CI or review feedback was inspected. No checklist closure or
coverage gain is claimed.
