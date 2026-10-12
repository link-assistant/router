Drafted structural while-let lowering through original Rust tokens, the existing
checked pattern ownership/planner and loop/conditional meta vocabulary to the
shared JavaScript/TypeScript emitter. Full original Rust 1.89 compiler lowering
source pins the loop scope, once-per-condition subject, success body and failure
break transitions. Original condition and body source spans remain in metadata.

The initial Node and Bun cohorts each passed 181/183 cases, with matching
nested-projection and source-constant failures. The generic projection planner
now retains actual constructor/field/type paths and refuses forged or divergent
paths; per-file closure selection includes constants referenced by patterns.
The eight authored source/runtime/meta/strict-TypeScript cases now include
these extra proof controls. The frozen repair passed 182/183 in both engines, including all eight new
while-let cases. Its only failure was an old unsupported expectation for a
valid tuple let-else; that unchanged Rust body now has a positive runtime
fixture with unrelated error payload and malformed-ABI controls. The complete
184-case final pair passed in Node and Bun at frozen 20eddea9c, including
strict TypeScript execution. All six full raw logs, source input manifests,
harnesses, failure inventories and resource receipts are preserved losslessly
in the verified compact archive.
Mutable borrows, owned aggregate bindings,
stored cursors, unproved Drop semantics, let chains and labelled/value controls
retain their existing refusals. No producer, corpus gain or full parity is claimed.
