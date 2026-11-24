Source-only draft: derive symbolic builtin callback forwarding and registration
dataflow from complete pinned original Rust inputs, retaining branches, operand
tokens, lexical scopes and exact spans. Connect that evidence to the existing
checked primitive formatter without replacing source bodies or widening its
macro/trait admission. Keep missing registration input, fmt::Arguments ABI,
allocator, I/O and compiler-owner obligations explicit. Seven new tests are
UNRUN; no runtime/namespace/native closure claim.
