Draft a reusable source-qualified Rust 1.89 primitive f64 runtime family for
is_nan, is_finite and floor, plus exact unshadowed f64::NAN source handling.
Preserve NaN, infinities and signed zero without claiming NaN sign/payload
observability, shared receiver autodereference, binary32, primitive min/max or
floating CTFE. Pin bounded original Rust core/std source archives and portable
runtime declarations. This source-only draft depends on Root's reviewed but
untested binary64 literal draft febb34aea; compiler and both-target behavioral
checks remain pending the coordinated window. Original policy attributes and
source bytes remain intact; tool-attribute proof is a separate prerequisite.
