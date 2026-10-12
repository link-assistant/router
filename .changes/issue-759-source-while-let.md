Drafted structural while-let lowering through original Rust tokens, the existing
checked pattern ownership/planner and loop/conditional meta vocabulary to the
shared JavaScript/TypeScript emitter. Full original Rust 1.89 compiler lowering
source pins the loop scope, once-per-condition subject, success body and failure
break transitions. Original condition and body source spans remain in metadata.

Eight authored source/runtime/meta/strict-TypeScript cases remain UNRUN.
Mutable borrows, owned aggregate bindings,
stored cursors, unproved Drop semantics, let chains and labelled/value controls
retain their existing refusals. No producer, corpus gain or full parity is claimed.
