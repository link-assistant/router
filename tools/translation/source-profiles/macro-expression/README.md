# Original bounded macro expression grammar

This profile reuses the complete original Rust 1.89 expression parser and AST
schema archives and retains the complete parser module at the same immutable
revision `29483883eed69d5fb4db01964cdf2af4d86e9cb2`. Existing profile rows and
archives are unchanged.

The private source recipe retains the actual prefix, borrow, mutability,
postfix, method/field, and opaque-expression parsing functions and the original
MethodCall slots. The bounded TT grammar admits shared `&` and individual `*`
prefix tokens, ASCII named fields and method calls with existing bounded
arguments. It preserves the original expression fragment during forwarding.

Mutable/raw/lifetime borrows, numeric/keyword/Unicode fields, generic methods,
await/use/match/yield suffixes, indexing, binary operations, closures, and new
block forms remain refused. Adjacent Stars use the separately proved exact
original TT projection, retaining each punctuation span. Existing
opaque macro captures stay syntactic captures with unproved expansion.

This profile grants no callee, trait, allocation, ownership, namespace, or
runtime authority. Original visitor wrapper expansion and Default output
confinement are separate private joins.
