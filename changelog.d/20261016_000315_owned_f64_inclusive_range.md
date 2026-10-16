---
kind: added
---

Draft the explicitly owned `translation_core::f64_inclusive_contains` operation
for three by-value f64 arguments. Rust uses ordered IEEE comparisons; JavaScript
and strict TypeScript use the existing checked float runtime and reject coercion.
NaN, infinities, signed zero, inverted bounds and evaluation order have shared
behavior fixtures. The Rust library implementation is intentionally untranslated;
its independent Rust oracle is CI-only and UNRUN locally.

A conservative CST producer proposes qualified API adoption for fresh decimal
inclusive ranges with a written `&identifier` argument, preserving complete
before/after source, canonical CST and inverse mappings. Ambiguous producers,
nonliteral endpoints and shared closure arguments remain unchanged. This is
maintainer-authorized API adoption, not a proof of arbitrary standard Range
method dispatch. The initial real validator proposals retain all other checker
obligations; source edit counts are not executable coverage gains.

Actual migration/class-entry production and all JavaScript/TypeScript receiving
checks are UNRUN for this draft. Generated class metadata is not hand-edited.
No full synchronization or runtime parity is claimed.
