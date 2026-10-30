# Original native lexical binding draft

The explicit native resource successor now renames actual local value bindings
before the existing complete source/meta/body checker. A separate complete
reader copy retains original parameter, declaration, assignment and reference
token spans. Initializers resolve in the previous lexical scope; each new let
then becomes visible. Child blocks, loop elements and typed callback parameters
retain their actual scopes. Fresh portable names avoid the complete original
identifier universe and module names. Types, lifetimes, item names, literal text
and trivia are outside the substitutions.

Only complete parsed original syntax supplies edits. Match patterns, skipped
guards, opaque macro effects, compiler temporary expansion and untyped function
values require other rules. Unsupported normalization leaves the original source
for the unchanged canonical check. It cannot relax that check. The selected
normalized source is independently reparsed, translated through checked meta and
required to reproduce every emitted native token. Whole original and normalized
CST equations retain exact inverses; no public normalization record is a permit.
No across-invocation source, binding, owner or result cache is introduced.

The physical resource source-unit path selects this successor. Native authority
retains the original Rust bytes and records the checked normalization; paired
TypeScript alias retention compares the complete canonical normalized behavior.
Later JS/TS authority edits produce the canonical Rust projection through the
usual fresh conflict/atomic source transaction. The original direct canonical
native API remains available with its prior admission domain.

Five complete original source copies, both rule phases and full inverses are
retained. Independent direct/native generic/move/scope/cancellation/Unicode,
physical three-direction, source-forgery/refusal and real native oracle source
is drafted and unrun. No implementation, test, experiment, compiler, translator,
preparer, generation, local Rust tool, push or CI ran. Wider patterns and source
grammar, namespace/bootstrap, production adoption/parity and every unfinished
bulk requirement remain open.
