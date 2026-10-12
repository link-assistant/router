Drafted fresh fixed-integer Range and RangeInclusive reversal through the
existing Rust frontend, checked meta-language and JavaScript/TypeScript emitter.
Full original Rust 1.89 Rev, TrustedStep range iterator and range layout source
pins retain exact Git blob/SHA256 identities; existing Iterator source is reused.
The proposed helper follows original next_back end updates and inclusive
exhaustion before yielding, keeping original endpoint and loop/callback bodies.

The initial exact 19-file/175-case pair passed 174 cases under each engine.
Its sole failure used the test helper's existing result argument as an effects
runtime. The helper now supplies the actual emitted or compiled target's runtime
in an additive fourth callback argument, retaining its original first three.
The unchanged original endpoint-order fixture uses that runtime; retry pending.
This narrow next-based profile refuses stored or custom cursors, references,
reversal of other adapters and specialized terminal consumers. Original fixed
Item identity, source span, profile inputs and incomplete authority flags must
remain exact during meta emission. No producer, Rust build, corpus gain or
complete namespace/trait/runtime parity is claimed by this focused draft.
