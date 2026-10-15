Preserve the original shared-reference type, pointee and ampersand source
coordinates for checked Rust primitive borrow expressions without adding source/type-owner
or Copy authority to their operands. Reject by-value
bool/f64 expectations before borrowing, alongside the unchanged fixed-integer
refusal. Existing source ownership checks now distinguish inferred primitive
references from values at assignment, argument and return boundaries. String
and array borrow paths, portable coercion, float Copy/dereference capabilities,
and the original mutable-f64 negative are unchanged. Source-only candidate;
new and existing tests remain UNRUN.
