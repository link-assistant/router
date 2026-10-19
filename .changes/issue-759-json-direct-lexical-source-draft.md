Prepared direct pinned lexical branch execution for at most768 total raw
mantissa digits, including integer/fraction leading zeroes. The original cached
source is retained as licensed byte-pinned data; no application body is copied.
Upper-product arithmetic, normalization/error acceptance, actual fallback
candidate, positive hi64/sticky and native rounding follow the original branch
instead of substituting ideal decimal rounding.

A reusable retained-prefix/sticky operation preserves the original larger-tail
rule, including the source-inferred discrepancy. The JSON parser keeps that
larger domain unsupported. Added five authored cases, all UNRUN, with separate
negative zero, exponent error locations, boundaries and minimum overflow-prefix
coverage. No current parser guard, default numeric semantics, application effect
completeness or runtime/native parity is promoted. Bounded limb/source fidelity
and private feature-directed admission remain review/test obligations.
