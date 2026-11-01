# Actual policy collection edge oracle source

`rust/tests/policy_collection_edges_20261101.rs` adds independent source cases
against the real public `SubscriptionEntitlementPolicy` implementation. No
standalone replacement policy, renamed enum or detached mock is used. The native
integration source includes its package-local independently authored JSON fixture
at `rust/tests/fixtures/policy-collection-edges-20261101.json`, which can also be
consumed by future target receiving cases without generating expectations from
translation tables. All source is UNRUN; native execution belongs only in gated
CI after the complete same-SHA JavaScript gate. No local Rust tool was invoked.

The cases cover alias/case/whitespace deduplication into exact nominal records,
rotation/reversal insertion permutations, canonical Display sort order, and
independence of returned owned Vec/Copy records from the underlying policy sets.
Proxy aliases deduplicate independently of subscription overrides. A later
invalid row must return an error rather than a partially configured policy;
unknown/wildcard/pending/generic identities and malformed separators stay refused.
The explicit bridge matrix cannot override protocol identity or missing signed
client identity. Native catalog acceptance remains distinct from request protocol
acceptance, with independent fixed expected cells.

Unicode cases deliberately separate native Rust White_Space from ECMAScript
`String.trim`: NEL is accepted, while BOM and Mongolian vowel separator are not.
Fullwidth client letters are not ASCII client aliases. These source expectations
will catch replacing native trim/identity behavior with a superficially similar
JS operation. No runtime comparison or Unicode experiment ran during drafting.

These are real native feature/oracle additions for nominal Copy/collection and
policy translation work. They do not make the policy methods, HashSet/self
fields, enum/record producers, Display/ToString/canonical-name sorting or target
counterparts executable. JS/strict TS adoption, original private ownership and
whole caller qualification remain requirements. Source/CST translation inverses
apply to those future translator lanes, not to this independent native test-data
addition. No function coverage, parity, performance or broad checklist closure
is claimed. Original whole case files, deadlines and eight-stage gate remain.


Requirement mapping: actual case/oracle source contributes to T01/T02/T03 and
P03, and provides independent O02/B03/B04 collection/nominal owner expectations.
All these broad rows remain OPEN. The added native test/fixture paths belong to
the inventory's test roots; a later inventory reconciliation must record them
as additions, not silently inherit the older baseline's assignments.
