---
major: []
minor: []
patch:
  - router
---

Draft original Math-to-Bigint data/data_mut and Hi64 forwarding through the same generic source-to-serialized-IR mechanism. Selected actual trait defaults, actual Bigint impl getter bodies and slice impl bodies retain whole-module hashes and original tokens. Private data/callee context extension preserves existing associated-source bindings; cloned public metadata cannot reconstruct source seals. No original arithmetic/getter function is manually replaced.

Three additional meaningful cases are authored UNRUN: both-word hi64 call-chain/sticky expectations, actual power-loop forwarding with retained Default allocation rejection, and private-context/duplicate-source negatives. The coherent affected arithmetic scope is now 37 cases (verified earlier 30 plus seven new storage/forwarding cases); no engines, parser/projection probes or producer ran for this draft.

Receiver/AsRef/Vec/Copy/trait/cfg/architecture are still mathematical models. The actual default with_capacity(20), allocator/OOM/abort/Drop, ownership and whole-reader obligations stay unsupported, with parser/native/effect/namespace authority false. This does not change the current float_roundtrip admission guard.
