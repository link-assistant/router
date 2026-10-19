Add a pinned Rust 1.89 String/str PartialEq profile without coercing or moving
checked operands. Shared String field places require their actual nominal field
layout and receiver projection evidence; unknown/custom/mismatched references
remain refused. The original RefUpdate is_create/is_delete declarations and
bodies are pinned by source spans and SHA-256 and exercised in emitted JavaScript
and strict-compiled TypeScript with independent literal expectations. This proves
two bounded production methods, not whole-file or runtime parity. The focused
equality and existing method suites pass all 24 tests on Node and Bun, including
both emitted targets, hostile-input guards, and operand evaluation order.
