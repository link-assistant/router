# Guard the internal lexing initializer before new observations

The completed-child cold-import workload first loads the original common
intrinsic issuer, then wraps `Object.getOwnPropertyDescriptor` or `WeakMap.get`
before importing the complete freezer. Its original tape and freezing workload
must stay unchanged. The newer private proof dependency imports the original
lexing guard module, whose initializer captures the current descriptor function
and calls it for `Array[Symbol.species]` and every required pin before deciding
whether those operations qualify. A late descriptor wrapper therefore observes
new calls even when the eventual eligibility result is false.

This source-only proposal keeps `original-lexing-intrinsics.mjs` byte-for-byte.
It derives a distinct `guarded-proof-lexing-intrinsics.mjs` from that complete
source. The language sequence removes only the two native export modifiers.
The repository sequence preserves the full original import prefix and wraps
every remaining original byte in one private factory. Its first executed
statement calls the preloaded common issuer's
`originalBatchedDataFreezeIntrinsicsUnchanged`. A false result returns two false
eligibility functions without executing any original reflective initializer.
A true result executes every original initializer and function body in its
original order, and returns the actual original named guard functions.

Only the actual lexing import literals in `private-native-proof-json.mjs` and
`private-frozen-json.mjs` route to this copy. Their full function bodies,
private issuers, limits, cost policies and caches remain unchanged. No other
consumer switches, and the original standalone lexing APIs remain available.
The new module adds no source, owner, encoded-result or guard-verdict cache;
its bootstrap snapshot has the same intrinsic-qualification role as the
original module. A refused bootstrap remains ineligible after restoration;
a healthy bootstrap checks later changes freshly and can qualify again after
the host is restored.

The domain is the existing trusted/common bootstrap, with the original common
module already loaded before the observed import. This is not qualification of
an originally hostile common initializer, and captured identity alone is not
used as evidence of a cold provider closure. Common guards inspect through their
original captured operations; the proposed false branch does not invoke the
currently wrapped descriptor or WeakMap method. Tests preserve that preload
boundary and install hooks before importing the actual subject in fresh child
processes. They do not prewarm lexing, private proof helpers or the freezer.

`prepare-guarded-proof-lexing.mjs` retains complete native selections, exact
private import joins, two separately serialized/reparsed source-CST phases,
per-phase native/CST inverses and a whole-source inverse. Native inspection
checks that the factory's first statement is the prerequisite and every next
original statement/body is unchanged. All actual original/private/common source
inputs are reread after construction and proposal transport. Those DATA records
grant no semantic permission.

Root receiving commands, unrun by this worker:

```sh
node tools/translation/prepare-guarded-proof-lexing.mjs --emit /private/tmp/router-guarded-proof-lexing-source-v1
# Review the complete three sources and install only exact afterimages.
node tools/translation/prepare-guarded-proof-lexing.mjs --check
node --test tools/translation/test/guarded-proof-lexing.test.mjs
node --test tools/translation/test/completed-child-cost-join.test.mjs tools/translation/test/private-native-proof-json.test.mjs tools/translation/test/private-frozen-json.test.mjs tools/translation/test/private-data-freeze.test.mjs
# Repeat every complete file under Bun with unchanged cases/deadlines.
```

The six new cases cover full source inverses, exact healthy function source and
signatures, both cold hooks with the genuine completed-freezer workload, late
hooks/restoration and source/binding refusals. The original completed-child
case is untouched. Each new case retains 60000 ms and each fresh observation
child 10000 ms. Optional `ROUTER_GUARDED_PROOF_LEXING_VECTORS` retains full child
source, compressed wire, decoded reports and source plans. Existing pinned
consumers must receive exact known source-history updates where required; do
not relax their whole-input pins or patch generated outputs manually.

This is an unmaterialized source draft. No worker engines, Rust, remote writes,
default installation, performance qualification or complete-gate result ran.
