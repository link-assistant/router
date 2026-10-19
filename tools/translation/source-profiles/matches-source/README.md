These source inputs retain the complete original Rust 1.89 core definition and
std reexport of `matches!`. The two new compressed inputs are the full core
Cargo manifest (definition edition 2024) and compiler standard-library imports
handler. The existing core macro, std library and Rust licenses are referenced
by exact relative input paths and checksums; they are not duplicated.

The declaration is a real declarative rule, not a compiler-comment transcriber:
its opaque expression and pattern captures become the subject/pattern of the
original emitted match. The existing frontend currently reconstructs that
shape manually. A future checked bridge must transport privately parsed source
AST fragments through the actual rule, then consume its generated match tokens
with exact definition/call-site provenance and original caller namespace.

This profile grants no caller macro owner, prelude closure, pattern traits,
constant eligibility, allocator or runtime authority. The compiler injection
body is source evidence, not an executed implementation. All tests are unrun
until a coordinated compiler window. Rust sources are MIT OR Apache-2.0 under
the pinned licenses in `../namespace-standard/`.

The initial source-fragment kernel is a separate syntax component. It captures
an expression or pattern by the existing highest Rust parser, verifies complete
original token-tree consumption, and retains a private AST identity. Capturing
that syntax does not prove the consuming module view, macro owner or macro
edition; those proofs must precede its use in the declarative engine. The next
bridge must bind the actual definition edition and follow sets, preserve opaque
fragments in transcription, and project them only at the generated match's
expression/pattern positions. There is no current shared parser/Host hookup.
