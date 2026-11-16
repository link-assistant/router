# Original block local item source draft

Every new implementation and independent case is UNRUN. Source construction and
review ran no parser, translator, model, preparer, tests, experiments, generation,
Rust tool or CI-triggering push.

The positive original parser now composes its existing complete data grammar
inside function and attribute expression blocks. Local named/tuple/unit structs,
enums and their original attributes retain full bodies. Additional positive
forms cover type aliases with generics, constants including underscore bindings,
statics including explicit mutability, extern crate names/aliases/discards, and
uses with their written visibility. Types and initializers use the existing
positive grammar, preserving opaque Ty and Expr macro roles. Malformed or
unsupported items still fail complete parsing. The data-item entry continues to
parse original complete top-level items with its original default behavior.

The source-only block model classifies these declarations as native Item
statement candidates, retains modeled child modules and restores sibling parent
scopes. External crate sites preserve source aliases, attributes, unresolved
crate loading, macro-use prelude effects and global exports. Source names and
modeled module IDs provide no native resolver or binding identities.

A complete copy of the existing native reader retains thirteen source inputs
and seven full receiver containers, and extends forty callbacks with four whole
external-crate/macro-use paths. The pinned source includes crate-root legality,
self-crate restrictions and prelude binding behavior; its presence does not prove
the actual native mutable visitor ran on this AST. The original reader stays in
its separate private domain. Original 8 MiB/200000 source bounds, current guards,
serialized/reparsed CSTs and complete physical inverses remain mandatory.

Five compiler equations retain complete original modules, native class/function
owner spans and separately ordered language/repository rules. Independent unrun
source and CI-only native cases cover declaration shapes, attributes, opaque
macro roles, scope restoration, aliases, original storage and refusal. The shared
header fixture now supports genuine expressions with no macro invocation; it
returns null invocation handles rather than fabricating one.

Native AST/visitor/parent-scope mapping, crate loading, actual attribute owners,
global macro closure, type isolation and executable admission stay unqualified.
Whole production forward/reverse translation, synchronization, source banks and
exports, strict parity, eight-stage JavaScript verification, gated Rust CI and
receiving qualification remain unfinished with every other bulk requirement.
