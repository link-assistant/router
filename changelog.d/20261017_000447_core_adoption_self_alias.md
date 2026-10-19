JSON read/copy and eager collection adoption now recognize an exact original
`extern crate self as name;` only when the existing module binder resolves that
same declaration to the tracked crate. The selector joins the current complete
source/view/profile and original declaration spans, and rejects external,
malformed, reserved, competing, conditional or producer-uncertain bindings.
All other scope and canonical-owner checks remain in force. This changes source
candidate selection; it grants no original trait dispatch or executable authority.

The new whole eight-case fixture preserves full CSTs and inverses, exercises
root/inline/physical alias scopes and JS/strict TypeScript targets, and retains
the complete actual library root and structured-output parent separately from
its explicitly projected entry. Wholecrate migration gains remain unmeasured.
Source-only draft: no local engines or Rust execution; current generated core
source/class producers and receiving are required before qualification.
