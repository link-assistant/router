# Guarded primitive failure continuation source draft

SOURCE ONLY. All implementation and complete case sources are UNRUN. This draft
does not establish measured coverage, canonical freshness, receiving readiness,
platform results, Rust behavior, CI status or complete application translation.

A new bounded observation module distributes scalar expression continuations
through ternaries and Boolean short-circuit operations when their selected
operands may fail. It first evaluates earlier operands in source order, then
captures a separate ordered event prefix for each branch. The selected value
continues through its enclosing arithmetic, immutable locals and return. It
retains all existing work/depth limits and the complete branch bound; expansion
cannot silently truncate a path. Pure legacy expression models keep their old
path when no guarded failure needs the new rule.

Both current native body consumers select this same complete implementation,
with independent receiving and actual-native adapters. Receiving source must
already have its whole private program and native origin; native declarations
must come from fresh checked source/lowering and original signature checks.
The adapters are model observations only. Temporary Symbol-keyed bindings live
in one operation's model environment, resolve to ordinary closed symbolic values,
and never enter semantic meta, compiler issuance, emitted source or installed
files. Public models and copied source remain incapable of granting admission.

The existing paired source projector emits the normalized model as complete
statement branches and immutable ordered locals. Existing receiving source
reissue, complete meta/CST transport, independent native body comparison, helper
closure, source equations and fixed-point checks remain mandatory. Earlier
short-circuit/ternary refusal witnesses now assert selection of this source
rule; they remain UNRUN. Independent cases cover all widths, overflow in an
unselected arm, earlier nested argument failure, later local continuations,
guarded helpers, native append/bulk and explicit expansion refusal. CI-only Rust
oracle source retains matching selected-arm behavior.

The rule covers the separately qualified scalar failure family. General owned
or borrowed JSON branch transfers, expression-position ordered matches, division/
remainder zero ordering, negation, shifts, constants and whole application closure
remain OPEN. Unsupported source retains its independent refusal paths.

Five complete source-copy equations retain exact originals and inverses in the
fixed language then repository phases. No implementation, test or compiler was
executed while authoring this draft.
