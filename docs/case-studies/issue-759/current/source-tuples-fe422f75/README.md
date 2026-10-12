# Inferred scalar tuples and structural tuple matches

The 26-file focused batch at
`fe422f75cff696b5e1d085a1a9872d3017f49e05` passes all 194 cases in
Node 20.19.4 and Bun 1.4.3, with no skips. Node took 114.954 seconds;
Bun took 67.578 seconds. Both engines verified the same 1,378 hashed inputs
on an unchanged clean tracked head.

The 22 new cases cover actual tuple/unit source patterns, exact generated
product layouts and arity, exhaustive matrix checking, nested products,
checked scalar inference, Rust integer identities and single source-order
evaluation. Unsupported integer defaults, borrowed/owned/nominal/float fields
and unchecked aggregate copying remain refused. No original source body is
replaced. Scalar inference and pattern plans survive serialized and reparsed
checked meta before JavaScript and strict TypeScript emission.

The added bulk regression exercises standalone per-file emission and an
out-of-line helper/consumer graph through `translateSource` with the original
project declarations and source scopes. It checks inferred layout retention,
the actual qualified owner and the four-case truth table in both emitted JS
and independently strict-compiled TS. Existing whole-original fixtures retain
their source hashes, spans and remaining admission obligations.

The initial Node run passed 194 cases; Bun passed 192 with two failures. Its
default five-second deadline cancelled an existing two-profile if-let fixture
and killed a TypeScript child; a late compiler failure was attributed to the
following record fixture. The repair sets finite outer deadlines of 65 seconds
for two capped 30-second compiler calls and 35 seconds for one. Each compiler
still has its 30-second limit, the focused batch retains 360 seconds and all
semantic assertions remain unchanged. Both complete reruns pass.

The [receipt](router-759-current-tuples-fe422f75-receipt.json) records all four
runs and their commands, hashes, counts, resource scope and limits. The
[184,563-byte evidence archive](router-759-current-tuples-fe422f75.tar.gz)
retains every raw log, receipt, input manifest and exact helper, including the
initial timeout and dangling-child evidence. SHA-256:
`9fc4b099628f4014f48b35162543e8fdcd08ff0064b9138cc97f572efe290645`.
All 14 members were reopened and hashed; two exact duplicate input manifests
use tar hardlinks while retaining their complete bytes and original names.

No canonical/profile producer, complete JavaScript gate or Rust build ran in
this batch. Full-corpus gain, complete translation and native runtime parity
remain unproved. Child maximum RSS is not aggregate process-tree peak.
