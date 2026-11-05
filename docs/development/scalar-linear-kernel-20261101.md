# Linear scalar stage specialization — source draft

`tools/translation/scalar-linear-kernel-20261101.mjs` implements an additive
whole-function target specialization lane over the actual scalar-chain compiler.
It is used by emitted-target receiving cases and both new interpreter entrypoints;
the runtime helper is not an unattached inventory entry. Existing compiler,
runtime, interpreter, inverse and native core APIs remain unchanged.

`proposeScalarLinearKernel(data, options)` accepts the same complete original
source data and explicit 2..8-stage chain selections as `proposeScalarChainBulk`.
It first runs that entire original forward/reverse proposal. A fresh original
source context then checks the complete migrated module again. Its complete
semantic meta is serialized/reparsed through the real original reader, privately
reissuing every source/type/ownership/runtime fact. Only that freshly checked
program enters `scalar-linear-kernel-20261101-plan.mjs`; no supplied plan,
public schema, source hash or stage flag can select this lane.

The selector consumes the entire body of every function in each selected module:
one checked shared primitive slice input, isolated empty owned accumulators,
the initial scalar loop, subsequent immutable-length/count/get/Some loops,
one map push or Boolean filter action per stage, and the final owned return.
It rejects extra observations, aliases, partial bodies, local calls, callbacks
with captures/effects, unexpected branches/exits, non-scalar items and escaping
loans. The scalar-expression selector permits only the existing checked pure
primitive IR and genuine operation metadata. A module containing another
function outside this complete shape refuses specialization as a whole. It
does not silently optimize an enclosing refused owner.

`extensions/scalar-linear-kernel-20261101-runtime.mjs` delegates all carrier
and scalar admission to the actual existing `router_vec_DOMAIN_len` validators.
Thus frozen dense ordinary arrays, proxy/accessor/descriptor refusals, exact
bool/integer/bitwidth checks and the 4,096-value limit remain mandatory. Each
stage validates its complete input once, reads those immutable own scalar
values once, and builds a fresh array through own data-property definitions.
Map results pass the original scalar validator on a constant-size frozen
singleton before the next callback runs. Filters require actual Boolean
results. The complete output is frozen and passes the existing whole-carrier
validator before publication. No per-element full-vector `get` or functional
push/copy occurs in the specialized stage.

Consequently the runtime work is O(n) per bounded stage by source inspection,
including validation and fresh output construction. Every stage completely
finishes before the next begins. A later first-stage overflow therefore still
precedes any second-stage division by zero. Empty stages retain domain and
callback checks while invoking no callback. There is no mutation of an input,
shared mutable builder, returned loan, value cache or cross-invocation cache.
The helper's public callback argument supplies no compiler authority; actual
compiled callbacks come exclusively from the complete private pure-IR selector.

`scalar-linear-kernel-20261101-execution.mjs` emits actual JavaScript and
strict TypeScript wrappers importing that helper and the existing checked
primitive operators. The matching declaration has separately inferred map and
filter overloads; strict compilation is not weakened with `any` or target casts.
`runtimeFiles`/`receivingData` package complete helper/runtime/type mirrors at
the original runtime and declaration roots. The assets producer retains full
immutable source originals, reads and compares every physical helper afresh,
serializes/reparses its complete CST and closes every source read. Immutable
source archives are not cached current-source or ownership verdicts.

Canonical Rust remains the original fully checked native stage body, whose
existing Vec mutations and indexed reads already have native linear behavior.
No native export, ABI, namespace or trait owner is added. Complete original
target→specialized target source equations retain both substitution phases,
all original bytes and exact inverses. `translateScalarLinearKernelProjection`
accepts only a complete current exact specialized JS or TS artifact and replays
all original source/meta checks before returning that canonical Rust. Edits to
the specialized projection are refused and must use the original application
edit path. Arbitrary authored Rust iterator chains and general editable-kernel
reverse synchronization remain open.

`readScalarLinearKernelMeta` reissues the complete current original source and
compares the whole specialized meta before returning any program. All original
semantic meta and normalized stage data are retained; metadata is not a permit.
`evaluateScalarLinearKernel` and `evaluateScalarLinearKernelBatch` independently
reissue those same original facts and execute the same linear stages through
the existing primitive expression evaluators. Batch source/asset closing checks
run before and after every call, including failure. No persistent runtime token,
source/input/verdict/result cache or weakened original host guard is introduced.

The ordered language/repository pipeline and complete DATA occurrence accounting
retain the existing UTF16/UTF8, source/meta, cell/depth and 4,096 limits. Source
and asset fences attempt every closing check and preserve the primary error.
Existing APIs, deadlines and complete earlier test workloads were not changed.

Independent new source cases cover all eleven primitive extrema, full 4,096-value
runtime stages, eager errors, strict type/refusal domains, getter/proxy traps,
whole-body nonselection, tampered meta, exact JS/TS inverse, and both stateless
interpreters. Four actual emitted-JS/strict-compiled-TS receiving cases retain
the 60-second complete case and 20-second child limits, TypeScript5.9.3/raw
receipts, fresh Node/Bun children and cleanup. The independent
`rust/tests/scalar_linear_kernel_20261101.rs` oracle is discovered by the
existing gated Cargo CI, without adding a native ABI or invoking Rust locally.

The new standalone specialization entrypoint is concrete and reviewable; shared
production dispatch, automatic discovery, export closure, platform adoption and
full Router synchronization remain open. Source preparation is additive:
import this entrypoint, pass the complete original receiving data/options, and
materialize its returned exact artifacts and runtime files through the existing
receiving harness. No shared root or preparer chain was edited. All old complete
compiler checks remain prerequisites; no default root speed gain is claimed.

The compiler still performs substantial fresh source/CST/meta and inverse work;
the new tests deliberately retain that work in their original deadlines.
Source-level O(n) stage construction does not establish measured speed, receiving
success, total compiler throughput, parity, executable production coverage or
checklist closure. Every new parser/compiler/translator/preparer/interpreter,
benchmark, runtime and native test execution is **UNRUN**. CI/review feedback
was not inspected. All original-array owner/input/body-equivalence flags remain
false and broader ownership/capture/aggregate/cancellation work remains open.
