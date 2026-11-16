# Shared optional JSON operation catalogue source draft

All new implementation and independent cases are UNRUN. Source writing and
review executed no lookup, runtime, compiler, preparer, tests, experiments,
generation, Rust tool or CI-triggering push.

The opaque optional-reader operation records now derive from the existing
finite direct-reader catalogue. Selection requires a registered Value as_*
operation, exactly one JSON-reference argument and an already supported optional
payload. Member, result and root metadata retain their original exact values.
Non-reader methods, predicates, unknown payloads and different arities do not
become opaque APIs.

This removes a second manually maintained nine-record type/root list. Future
catalogue changes still require real runtime exports/declarations, native
equations, input boundaries and independent source/symbol/ownership checks; a
data record cannot issue a caller or make an absent export executable.

Two complete compiler equations retain original whole modules, native owners,
separate rule phases and full CST/meta/source inverses. Independent unrun cases
cover all nine exact contracts, refusals, no-coercion names/arguments and complete
inverses. Existing full runtime and seven-context regression sources remain
required and unrun. No freshness, parity, receiving, performance or completion
qualification is claimed; every remaining delivery obligation stays open.
