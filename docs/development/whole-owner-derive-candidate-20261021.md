# Explicit whole-owner derive source candidate

This source draft introduces one new synchronous complete-owner operation. It
does not install a default, change existing single-owner APIs, or establish a
performance result. Its purpose is to replace repeated hashing of the same
complete binding program within that new operation, while retaining each
original owner selection, source hash, declaration hash, proof and refusal.

The complete unchanged original derive twelve-case trial at Root `1a37`
passed semantic assertions but failed its original 60,000 ms deadline:
case 10 took 81,936.854292 ms; the full trial took 133.656 s and peaked near
1.80 GB. That failed receipt remains distinct from subsequent CPU diagnostics.
The diagnostic retained all twelve workloads and passed assertions, but its
profiler timing does not qualify a candidate. Aggregating every raw CPU sample
by the exact function name and source URL, across profile node IDs, gives:

| Operation | Sampled cost | Interpretation |
| --- | --- | --- |
| `Hash.update` | 18,752.824 ms self | All 287 matching profile nodes; many different payloads |
| `attributeOwners` | 13,319.637 ms inclusive | All 19 matching nodes; overlaps hashing and serialization |
| `serializeProofData` | 7,670.651 ms self | All 13 matching nodes |
| Garbage collection | 7,371.034 ms self | Not independently recoverable time |
| `createDeriveBangContext` | 55,257 ms inclusive | One creation portion of the complete workload |

The raw profile is retained at
`/private/tmp/router-layout-check-diagnostic-whole-original-twelve-canonical-cpu-profile-v1/temporary/cpu/CPU.20261021.071231.12880.0.001.cpuprofile.gz`.
Its 7,509,156 decompressed bytes were inspected without running the workload
again. Inclusive rows overlap and must not be added together. The later
`resolveModuleBindings` portion independently reissues enclosing builtin
proofs outside the proposed creator scope. Thus this creator alone cannot be
credited with all 13.32 seconds of measured `attributeOwners` time.

## Source equation and operation

`prepare-whole-owner-derive-candidate.mjs` reads all seven complete current
derive/footprint issuer modules. Installed TypeScript 5.9.3 selects the actual
`attributeOwners` and private complete creator declarations. The proposal keeps
the old attribute helper intact, adds a separate helper for an active whole
operation, and creates a fresh private copy of the complete creator without its
old cross-call context-cache lookup or insertion. All seven copied module
edges remain in the new private issuer closure. All old copied creators retain
their original behavior and cache contract.

The explicit language phase performs these complete-source substitutions; the
repository phase relocates actual native import spans to the separate closure.
Every result retains the whole original source, serialized/reparsed CST,
native copied-binding checks, both rule sequences, complete inverse and fresh
input identities. The eighth output derives immutable wrapper-source strings
from the complete pinned official Node sources and retains the full license.
The source profile is DATA; actual runtime qualification remains independent.

The new operation obtains the private genuine source context afresh, requires
frozen ordinary source carriers, captures every complete source, resolves one
complete binding program and hashes its canonical JSON once. Each selected
owner still executes the actual original private selection assertion and all
scope, ancestor, namespace, shadow and original hash checks. Only the repeated
binding-program digest comes from that synchronous frame. It rechecks the full
original source/context and crypto/intrinsic boundary before returning any
result. The frame and its digest are cleared in `finally`; nested operations
create independent programs. No owner, source, digest, program or verdict is
retained across calls by this new operation.

The fast domain is limited to at most 20,000 original module carriers, module
paths of at most 64 segments, and 64 Mi UTF-16 source units. These are selection
bounds for the new operation: a larger or uncertain input executes the complete
original creator, without excluding a module or changing any old limit.
Nested legacy fallbacks temporarily suspend an outer operation frame and
restore it in `finally`, so a complete old read cannot consume another context's
batch. Unknown engines, crypto wrappers, JSON hooks and changed descriptors select the
exact original copied creator, including its original cached-context behavior.
Callbacks are not given a new reduced hash tape. Qualification requires the
callback-free pinned runtime domain; source data alone is insufficient.

The Node runtime source and private native-handle guard has a trusted common
bootstrap boundary documented in the source-profile README. It cannot prove
that arbitrary inaccessible native-constructor hooks were absent before its
first Hash construction. Later private method, constructor-chain and
`Symbol.hasInstance` changes are checked. This limitation remains explicit.

## Receiving and integration obligations

Source preparation and verification commands, to be run only under Root's
resource lease, are:

```sh
node tools/translation/prepare-whole-owner-derive-candidate.mjs --write
node tools/translation/prepare-whole-owner-derive-candidate.mjs --check
node --test tools/translation/test/whole-owner-derive-candidate.test.mjs
```

All eight 60,000 ms receiving cases are new and currently unrun. They retain
complete source/CST equations, full output equality, genuine copied consumers,
repeated fresh results, original Hash/JSON callback tapes, callback-installed
changes, unknown owner/forged context refusals, nested/exception/thenable frame
cleanup, private native-handle hooks and observed nested fallback isolation. No generated output has been edited
or installed by hand.

The unchanged original twelve cases under Node and Bun remain mandatory, with
their actual complete current inputs, original deadlines and source joins.
The default candidate is not replaced by this source draft. A future isolated
trial needs the complete seven-module overlay and the generated wrapper-source
DATA, plus the authored operation and crypto guard. Its physical creator
module must export the original consumers from the same copied private issuer;
passing its private contexts to a different original issuer is invalid.
No Root trial harness or default module is changed here. A separate explicit
whole-resolver operation could address the later reproofs; it is not silently
included in this creator's claimed scope or evidence.

The first Root receiving run materialized all eight actual outputs in
12.943 seconds, then passed seven of eight bulk controls. Its six-file cohort
passed 29/33 in 161.067 seconds with no deadline breaches; the other three
failures concern independent source-trace observers. The failed bulk case is
retained at `/private/tmp/router-layout-check-complete-whole-owner-proof-core-accessor-lifetime-thirtythree-Node-v1/stdout.log.gz`.
It compared the first observed original builder/profile replay against a later
call after shared compiler-unit caches had been populated. Missing JSON tape
rows came from those original generic Rust AST replays.

The source repair keeps both original `Empty` and `Other` inputs and the same
60,000 ms case. Each observer kind now compares complete legacy and candidate
workloads in independent fresh processes of the actual parent engine. It
observes all cold work, a fresh context after that work, and the same cached
context. No warmup is moved outside observation. Full result, JSON argument and
return tapes, plus callback-installed Hash argument/digest tapes, cross a
declared complete JSON wire boundary and receive strict whole-record equality.
Changing one existing nested callback result must fail that comparison. Four
sequential child requests have 12,500 ms bounds each and 64 MiB output bounds;
the original case limit remains 60,000 ms. This repair changes no production
source and remains unrun until Root qualifies the complete eight-case file.
