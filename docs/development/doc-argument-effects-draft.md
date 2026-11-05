# Documentation argument effect source draft

All new implementation and cases are unverified and unrun. No tests,
experiments, diagnostics, translators, preparers, regeneration, local Rust tools,
push or CI ran. Every unfinished requirement in
[the ledger](bulk-draft-requirements.md) remains open.

The binder previously treated the name `doc` as harmless while scanning nested
effects only after a root declaration's header. A nonliteral equality argument
could therefore lose its possible macro effects from the namespace result.
The new conservative source classifier keeps those effects unresolved on both
the local scope and crate root, including bang and attribute macro kinds.
Nested source uncertainty also reaches the root without an importing glob.
Qualified attribute paths keep type/attribute uncertainty even when their first
segment has a builtin spelling.

Ordinary literal documentation and delimited metadata keep their existing
behavior. The cheap classifier neither parses/evaluates a macro nor grants an
owner or namespace permit. It reads bounded own data without invoking accessors.
The binder imports this small classifier separately from the positive expression
reader, avoiding a new binder-to-parser initialization cycle or repeated complete
expression/CST capture on the ordinary binding path.

The additive original-expression effect API uses a genuine direct attribute
expression receipt and freshly rechecks it before and after walking the complete
positive AST. It retains opaque bang inputs, nested attributes and macro
definition frontiers, within a fixed source-cell bound. Even an empty frontier
list does not qualify native visitor confinement or global exports. Attribute,
macro, type, namespace and runtime authority remain false. Original argument
source is retained; no value is expanded, discarded or rewritten.

Three complete compiler equations retain complete original implementations,
native JS owner spans, ordered language/repository substitutions and full CST
inverses, joined after the attribute-expression source family. Independent unrun
cases cover literal/list fast cases, macro/qualified/malformed arguments,
accessor refusal, local/root/nested macro uncertainty, qualified builtin paths,
genuine AST frontiers and complete source histories.

The full builtin doc parser/registry and native visitor confinement join,
macro-valued documentation consumers, actual value-macro ownership/expansion,
broader attribute/language and production coverage, architecture/producer/global/
type-prefix closure, parity/freshness, all source/CI repairs and receiving-export
qualification remain unfinished. All original same-SHA JavaScript gates and
fatal CI-only Rust requirements remain mandatory.
