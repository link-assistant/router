# Actual policy decision and collection oracle source

All new Rust and fixture execution is **UNRUN**. No local Rust tool, parser,
compiler, translator or test was executed. This source adds no executable
translation admission, default source installation or current coverage claim.

`rust/tests/fixtures/policy-decision-matrix-20261101.json` contains independent
explicit expected decisions for every8 actual ClientKind values,5 protocol
surfaces and4 SubscriptionProvider values. Its40 rows each retain four empty
and four fully enabled policy cells. D/N/O mean Denied/Native/Override. Full
overrides are the12 independently listed reviewed client/provider pairs;
Cursor/Agent and Gemini/Qwen override providers remain rejected. A genuine
native cell takes precedence over an explicit override. Gemini/Qwen native
entitlements remain catalog-only; a missing signed client always denies.

The new `rust/tests/oracles/policy_decision_matrix_20261101.rs` joins the actual
production ClientKind/SubscriptionProvider census and invokes the real complete
SubscriptionEntitlementPolicy::default/parse/decide/overrides/proxied_clients
methods. It consumes no alternative implementation or lexical source permit.
The default, explicitly empty and full policies produce480 actual decision
observations over the160 distinct cells; absent-client denial is independently
asserted at each observation. A unique complete row census prevents repeated
rows from hiding a missing client/protocol pair. The expected table contains
no values computed by the implementation being checked.

A second native case covers all32 parse pairs and their explicit acceptance
masks. The complete12-record expected warning order remains literal. Each
rotation and reversal of that complete input duplicates pairs nonadjacently,
then checks real nominal deduplication, canonical Display sorting, detached
mutable returned Vec/Copy values and isolation from the proxy set. It changes
no native policy or authorization behavior. Both cases join the existing
`policy_collection_edges_20261101` integration target instead of linking another
Rust test binary. CI may execute it only after all eight same-SHA JavaScript
gates pass; native failures remain fatal.

The fixture is a later cross-language oracle for actual whole translated policy
methods. It grants no owner, trait, cfg, producer, self/HashSet, Display/sort or
private compiler authority. The current copied-record fixtures and actual
owner/producer adapter still have separate production admission obligations.
Receiving qualification must invoke genuine fresh whole native→meta→JS and
strict TypeScript targets, serialize/reparse CST and checked semantic meta,
retain full original source and compare this same independent table. A table
reader, handwritten JavaScript substitute, excerpt-only fixture or native pass
cannot close those obligations. No JS fixture test is claimed to exist here.
R01/R02/C05/O02/B03/V02/V04/T01/T02/E03/Q02 and full parent scopes remain OPEN.
