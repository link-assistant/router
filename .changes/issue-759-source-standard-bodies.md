Drafted reusable original Rust standard method-body extraction, actual
primitive Default macro expansion and shared typed specialization. The
original Option bodies and selected Default implementation blocks pass
through the ordinary checker and let/match/literal JS/TS emitter, with
actual source identities and parameter evaluation order retained.

This initial draft is UNRUN. It supports only checked scalar or borrowed str
Option payloads; Result unwrap_or retains its existing bounded contract.
Custom/derived Default, aggregate ownership, destruction, const execution,
mutable borrowed-local origins, complete core translation, corpus admissions
and complete runtime parity remain unproved.
