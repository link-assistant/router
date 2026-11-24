# Response model-alias JSON compatibility operation

SOURCE DRAFT ONLY / UNRUN. This batch adds an application-derived operation to
the existing owned JSON state family. It does not close P02/P03 or claim whole
response/stream translation. Accounting stays12/70 DRAFTED,58 OPEN; executable
production coverage remains UNKNOWN. No tests, compilation, parser/translator/
preparer trials, dependency installation or CI/review inspection ran.

## Actual production source and paired library

`rust/src/account_policy_response.rs::rewrite_value` rewrites exactly five JSON
pointers: `/model`, `/message/model`, `/response/model`, `/modelVersion` and
`/response/modelVersion`. A string slot must equal the exact upstream identifier
or the identifier after stripping exactly one `models/` prefix. Other strings,
non-string slots, absent fields, arrays and unrelated nested metadata stay intact.

The native `json_rewrite_model_alias` library implementation copies that actual
production body into the existing state library. It accepts owned Json and
borrowed upstream/visible strings and returns the owned Json. Library internals
remain native, as permitted by the compatibility-core contract. The source
record retains the entire original production file, selected original function,
whole original/current state module and exact native body-copy inverse.

The paired JavaScript backend uses the existing immutable canonical Json ABI.
It validates/copies through the original JSON/string helpers, applies the same
five fixed paths and exact matching, then rebuilds only the selected object
paths through the existing canonical constructors. The caller's canonical input
remains unchanged. There is no arbitrary JS object mutation, JSON pointer API,
coercion, callback or authority inferred from a public object shape. Existing
4096-node/depth32 JSON and scalar string restrictions remain; the native library
retains its broader original native domain. Values outside the translated ABI
are still gaps, never silently qualified response parity.

A single added `JSON_STATE_CONTRACTS` row drives the existing forward and reverse
operation bindings and TypeScript declaration emission. Parameters are
`owned-json,str,str`, result `owned-json`; no new statement or meta opcode is
introduced. The actual forward parser still captures and serializes/reparses the
complete native leaf, checks original module/configuration/source/type/ownership
and uses its original private emission issuer. Reverse profiles still require
actual unshadowed imports, complete canonical runtime/native inputs, private
whole-body reissue, checked meta and full canonical Rust reproduction. Shared
language semantics and repository bindings remain separate ordered sequences.
No name, hash or contract row grants those private facts.

## Production adoption remains explicit

The source proposer retains a complete uninstalled replacement of the actual
`rewrite_value` body with an owned core call and `std::mem::take(value)`. This is
source construction only. The mutable Json parameter, mem::take call, complete
original caller ownership and the async response/stream composition still need
compiler support and whole-function admission. The actual mutable rewrite body remains unchanged. The subsequent
[response adoption](model-alias-response-adoption-20261104.md) installs the owned
operation in the non-streaming response branch and preserves these complete
historical images through an exact successor. Streaming keeps the mutable API.
Do not count this proposal as a translated production function.

The new native oracle module compares both the actual production function and
the owned library function against independently stated expected JSON. It covers
all five locations, unrelated text, one-prefix matching, whitespace/case,
non-string/array shapes, Unicode/NUL/empty IDs and repeated application. These
Rust tests use the existing module/target and are CI-only after every same-SHA
JavaScript gate succeeds; no local Rust tool ran.

Independent JavaScript runtime cases cover the same boundaries, immutable input,
exact shared declarations and proxy/accessor/coercion refusal. A complete owned
Rust caller source case exercises the original forward/private pipeline and
strict emitted targets. Six actual reverse profile cases retain source/meta,
both interpreters, typed projection, canonical Rust inverse and altered native
leaf refusal. Every case remains UNRUN, including the original whole family.
Future failures reopen the implementation scope instead of inheriting old results.

## Whole source records

`model-alias-json-core-20261104-profile.mjs` captures exact native facade/Cargo
inputs, the five installed library/registration/declaration sources, the complete
production/oracle source and the uninstalled caller proposal. Both substitution
phases retain whole intermediate Rust/JS/TS CST serialization/reparse and exact
inverses. Lexical function selection establishes source coordinates only; it
cannot issue a Rust owner/type/body or executable receipt. Observed source
failures poison enclosing source operations; original closers preserve primaries.

Packet `source-profiles/model-alias-json-core-20261104/complete-source.json.gz`,
SHA `2c8c01406d2578d9b9f2420aa39ceeaca3c28b24c02d1d10b2b95761678f6155`,
49784 compressed bytes, retains5 library parents,1 production caller proposal,
1 complete oracle-parent equation,3 independent creation sources,4 actual
native/Cargo guards and the whole native body-copy origin. The earlier source
archives and core operation implementations remain unchanged in history.

The subsequent response adoption records the precise source-history joins and
non-streaming production adoption. Wider freshness, unbounded/native-versus-target domains, response
body/status/header/compression handling and streaming backpressure/cancellation/
EOF/error contracts remain unfinished. Continue these with O03/O04/O05, B01–B04,
F/V/S/T/E and P02/P03 scope; no parent bundle closes in this increment.
