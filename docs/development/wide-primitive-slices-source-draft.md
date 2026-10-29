# Fixed-width shared primitive slice draft

All implementation, cases and CI-only Rust oracles are UNRUN. Full translation,
the complete requirement draft and every qualification obligation remain OPEN.

The complete copied slice contract adds u8/i8/u16/i16/u32/i32/u128/i128 to the
existing u64/i64/bool roles. New native signatures spell their elements through
`::core::primitive`, and actual primitive runtime declarations remain mandatory.
Native slice ownership, live borrowed roots, standard primitive Copy and full
body/source checks are unchanged. The original three-domain public contract
module retains its old API and refusals; its old input behavior is unchanged.

The new fixed-width source boundary is explicit: original JavaScript/TypeScript
must call the actual registered `primitiveSliceInput` at entry, in parameter
order, with its genuine parameter and exact domain. A readonly annotation alone
does not establish immutable storage or authorize changing the original input
contract. Missing guards refuse translation. Canonical emitted TypeScript and
the Rust-to-JavaScript source proposal reproduce the guard; receiving re-entry
checks the complete original import binding and parameter symbols before
removing that source prefix from semantic lowering. Public metadata or a copied
function name cannot supply that binding.

The runtime guard requires an ordinary dense frozen array, immutable own data
elements and the exact signed/unsigned range. It refuses proxies before their
traps, accessor elements without reading them, holes, extra fields and coercible
domain objects without converting them. It retains array identity. The frozen
primitive elements remain stable across asynchronous suspension. Full validation
is linear in input length, uses a temporary own-key list, runs before the body,
and has no 4,096-element cap. This is a supported immutable input envelope;
mutable arrays and noncanonical containers stay outside it. No source, hash,
owner, verdict, input or result cache crosses operations.

Both outcome and cancellation source/typing/emission paths select the copied
contract. Their independent single and batch interpreters apply the same input
guard, including functions with no integer runtime call in their body. Runtime
preparation loads the actual complete primitive module for those parameters.
Rust projections retain copied iterator behavior and qualified element types,
and the new JavaScript proposal inserts its explicit immutable input contract.
The source modules retain their original line counts below 1,000.

Thirteen complete source substitution equations preserve whole originals,
language then repository phases and exact inverses. Independent source cases
cover ten sets of integer extrema and adjacent refusals, getter/proxy/hole/
mutable carriers, old API preservation, complete new-width JS/strict TS/
interpreter/batch/Rust inverse cases, private binding/prefix refusals and arrays
longer than 4,096 elements. A separate Rust integration oracle exercises actual
shared slices, copied values, early return and long input in all ten domains.
It is drafted for fatal gated CI; no Rust runs locally.

Independent cancellation/await receiving, mixed input families, the complete
exported compiler in a receiving repository, actual application migrations,
forward/canonical/platform and reverse freshness, performance and full parity
remain unqualified. This draft provides no current coverage percentage or claim
that readonly arrays in arbitrary source translate without a written contract.
No tests, compiler, parser, preparer, translator or generation ran. CI feedback
remains uninspected until the entire requirement set is drafted.
