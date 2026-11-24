# Independent credential expiry and scoped-clock oracle source

The actual production `auth_import::describe_credential` now has independent
CI-only oracle source in
`rust/tests/oracles/credential_expiry_edges_20261101.rs`, included by the existing
policy collection integration target. No additional integration binary is added.
Neither production implementation nor existing case source was replaced.
The fixture is `rust/tests/fixtures/credential-expiry-edges-20261101.json`.
Everything in this batch is UNRUN; no Rust tool, compiler, translator or test was
executed and no CI feedback was inspected.

The 16 independently written exact millisecond boundaries are crossed with all
three refresh states: absent, present empty text and present nonempty text.
They pin the real equality-at-expiry decision, Rust signed division truncating
toward zero for -1/-59,999 milliseconds, one-minute transitions, 90-minute and
48-hour formatting transitions and the current unchanged plural spelling.
An empty `Some("")` refresh token remains present: a JS truthiness test must not
silently classify it as `None`. Credential access/refresh/account/resource values
must not appear in the report, and the input token remains unchanged. The fixed
clock is supplied through the actual public `OperationContext::scope` mechanism;
no process clock/environment is changed and no external service is called.

A second case enters a later nested injected clock and checks the original
report after normal return and caught unwind. It exercises real task-local
restoration rather than a mock scope or an invented target API. Exact fixture
numbers are decimal strings for a future JS BigInt receiver; they are not
formatted or generated from the Rust implementation. Existing native formatter
extrema/day-boundary fixtures remain separate and unchanged.

These are native production oracle sources for O01/O05/P01/T01/T02/T03/T04.
Those whole requirements stay OPEN. No JS/TS target or private binding is
qualified, and no production function is newly counted as translated. A future
source-selected family must use the original complete caller, genuinely checked
SubscriptionToken fields/Option distinctions and injected clock ownership,
checked arithmetic/formatting semantics, lossless CST and reparsed meta, actual
emitted JS/strict TS and canonical native inverse. It must apply the shared
fixture against emitted target behavior without treating these expected strings
as an alternative implementation. Native extreme timestamp subtraction overflow
outside these safe fixed-delta vectors is not claimed solved or equivalent;
retain that unresolved arithmetic domain explicitly during adoption.
