# Positive nested scoped item source draft

All new implementation and independent regression source is UNRUN. The private
positive parser now retains complete nested inline/external modules, traits,
implementations and foreign declaration blocks inside original function bodies.
It parses every inline member with the existing private grammar, preserving
inner/outer attributes, visibility, generic parameters, trait bounds, where
clauses, receivers, associated type/const declarations and defaults, ordinary
method bodies and initializer expressions. Associated declarations keep their
original source children and unresolved owner/initializer fields.

Scoped item macros retain actual complete token trees and the Items position;
macros inside method bodies retain their expression/statement positions. Nested
macro definitions retain their full original tokens and unresolved effect flags.
External modules retain no fabricated file body. Foreign functions require a
complete declaration without a receiver/body, and foreign statics preserve mut
and types without an initializer. Unsupported foreign item kinds refuse.

Complete scope/member parsing retains the existing private parser identity and
source/native guards, serialized/reparsed complete CST, source associations and
node/depth/member/token/TT bounds. It grants no native AST, receiver, trait,
module/file, attribute, macro, visitor, ownership, global namespace, runtime or
executable authority. Source grammar does not establish native type legality,
feature/edition availability, dispatch, hygiene or whole-producer closure.

Two whole compiler equations retain complete originals, native owners, language
then repository stages and full CST/source inverses. Unrun independent cases
cover nested scopes, generics, full associated/method bodies, defaults, macro
positions/definitions, attributes, foreign declarations and malformed/incomplete/
receiver/owner refusals. A separate native local module/trait/implementation
oracle remains CI-only after all eight same-SHA JavaScript gates.

No parser, model, translator, preparer, compiler, runtime, test, experiment,
generation, Rust tool or CI-triggering push ran. Wider qualified/HRTB/type syntax,
all actual native owner/global/effect closure, production forward/reverse,
synchronization, source-bank/export materialization/freshness, parity, remaining
source requirements, receiving qualification and delivery remain unfinished.
