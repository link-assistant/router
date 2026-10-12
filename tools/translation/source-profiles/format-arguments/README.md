Portable source-only formatting stage inputs

This profile is intended for reusable automatic macro/compiler lowering, with
complete original sources and private byte verification. It augments the
existing checked primitive formatter; it does not duplicate that runtime or
authorize same-spelled source macros.

format_source_profiles loads and checks each available original input, retaining
an explicit diagnostic and false completeness when a required input is absent.
format_source_meta mechanically retains macro attributes/source scopes and
function signatures/body tokens/call edges. format_argument_source_plan retains
original invocation arguments and explicit source order, then expands actual
ordinary source wrappers through the generic declarative engine. It refuses
compiler-builtin comment-body expansion. No generated compiler AST, formatting
trait call, memory allocator or stdout/stderr implementation is synthesized.

Current sources do not close std/alloc export aliases, builtin registration and
ExtCtxt AST owners, rustc_parse_format integer/Unicode/lifetime dependencies,
HIR fmt::Arguments lowering/optimizers, formatting trait implementations,
allocation/OOM/Drop or I/O effects. All semantic/runtime/native authority remains
false. Tests are authored separately and initially UNRUN.
