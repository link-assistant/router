# Cancellable deadline tail source draft

The generic deadline producer now composes two existing qualified cancellable
operations: sleep and channel send. A callback must retain one complete awaited
tail using that callback's exact owned child cancellation input. The native and
JavaScript libraries independently remain the source of operation, cancellation,
queue, byte and error contracts. Both inner and outer Result constructors are
retained; an inner error never silently becomes a deadline error.

This reuses the original control lane's single-tail/no-post-await-effects rule.
The resource checker still checks every complete body and every nested argument
expression. Other argument operations must satisfy the pure-expression rule.
Only an original shared sender input gains the extra Copy capture case. Owning
senders, parent cancellation, exclusive receivers/streams/clients, borrowed
output roots, nested deadlines, unknown async helpers and post-await statements
retain explicit refusals. The added sender marker is issued from actual original
awaited callback syntax inside the fresh whole-source check; public meta cannot
supply it. Ordinary synchronous callbacks keep their previous capture domain.

The typed native async closure and complete reverse source proposal reuse the
existing reader, checked meta and exact original token reproduction. Promise
annotations preserve the actual async return boundary. Complete physical
`js/src`, `ts/src` and `rust/src` transaction cases now draft successive authority
edits, conflict/stale-source refusal and forged output rejection for this lane.
No generated application output was edited by hand.

Three complete prior sources, ordered language/repository substitutions and
full inverses are retained. Independent JS/strict TS, nested Result, child-token,
queue timeout/late writer removal, native inverse, physical transaction and real
native library oracle sources are drafted and unrun. No tests, experiments,
compiler, translator, preparer, generation, Rust tools, push or CI ran. Broader
async/resource cleanup, architecture namespace/producer closure, production
adoption/parity, complete CI repair and every remaining requirement stay open.
