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
source. The language sequence retains that complete original source. The
repository sequence preserves the full original import prefix and both original
exported guard declarations at module root. Only the complete initializer span
enters a private factory. Its first executed statement calls the preloaded common
issuer's `originalBatchedDataFreezeIntrinsicsUnchanged`. A false result returns
own undefined capture fields and `qualified:false` without executing original
reflection; the original guard functions then short circuit. A true result runs
every original initializer in order and returns the genuine captured values to
root destructuring. Native binding joins preserve every original guard read.


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
node tools/translation/prepare-guarded-proof-lexing.mjs --emit /private/tmp/router-guarded-proof-lexing-top-level-source-v2
# Review the complete three sources and install only exact afterimages.
node tools/translation/prepare-guarded-proof-lexing.mjs --check
node --test tools/translation/test/guarded-proof-lexing.test.mjs tools/translation/test/guarded-proof-lexing-top-level.test.mjs
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

## Top-level guard source follow-up

The original V1 healthy control passed on Node but honestly failed on Bun:
`Function.prototype.toString` prettyprinted the factory-nested functions with
additional indentation. The existing strict whole-source assertion remains.
V2 therefore keeps both complete original exported declarations at module root,
byte exact, and guards only their original initializer statements. Native binding
analysis selects every root value used by those functions; the private factory
returns those exact original values and root destructuring supplies the original
uses. The false branch owns every capture field explicitly, so inherited getters
cannot run before the original `!qualified` short circuit. No original initializer
statement or function body changes, and the private consumer imports stay exact.

The complete V1 producer is retained in a 4,071-byte pinned archive. Its actual
constructor is preserved with only a native-selected declaration rename; all of
its captured source helpers are checked byte exact against that archive. Only
its exact reconstructed target may precede V2. Complete V1→original→V2 CST
phases and inverses remain DATA; arbitrary previous generated targets refuse.
The archive has a typed full-byte final freshness fence, including later callers.

The original six receiving cases and strict runtime source comparison are byte
unchanged. Three additional whole cases cover native capture joins, an inherited
capture getter under a cold WeakMap observer plus full freezer workload, and
known-V1/foreign-target/binary-corruption refusals. These new source changes,
materialization and runtime receiving are UNRUN in the worker. Run the complete
old and new files under Node and Bun with their original limits after generating
all three exact current afterimages. Runtime qualification remains open.
