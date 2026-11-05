# Generic enum namespace source draft

The enclosing resolver now selects a bounded macro-free enum header instead of
rejecting every generic enum. Nested type angles, lifetime/const parameters and
where predicates select the complete original body. Retained complete Rust
resolver functions establish the enum TypeNS scope, actual variant TypeNS and
tuple/unit constructor ValueNS names, and parent-scope restoration. They do not
establish generic validity, traits, field layout or executable behavior.

The existing resolver remains the sole scope issuer. Visibility, configuration,
procedural owners, imported uncertainty and original source/view/profile joins
remain required. Expanded or block-valued headers refuse. The legacy resolver
remains available with its original refusal. Two complete source originals,
ordered language/repository substitutions and full CST inverses are retained.

Independent namespace, nested-angle, constructor, unknown-owner, copied-scope
and native Rust oracle sources are drafted. All implementation and receiving
checks are **unrun**. This removes a source-drafted prerequisite; it reports no
application coverage increase. Other namespace/producer closure, generic body
checking, actual production application and all remaining bulk rows stay open.
