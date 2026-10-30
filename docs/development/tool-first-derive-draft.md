# Independently genuine tool-first derive input draft

`createToolAwareDeriveFootprintContext` adds an explicit derive-input constructor
that recomputes genuine original tool ownership first. The explicit enclosing
project path selects it. The original default constructor and project path keep
their behavior. All implementation and regression source remains unrun.

A root function with `#[rustfmt::skip]` can have an independently closed type
prefix even when a child module contains derives. The existing tool constructor
can issue that original proof without a derive input context. Previously, the
subsequent derive input ancestor walk still saw the root tool attribute as an
unresolved producer. The new complete constructor copy feeds the actual freshly
issued proof into the original binding walk and both whole-module and requested
item attribute closures. It retains the real tool source/certificate references
and complete original derive source/dependency joins.

The tool constructor always receives the complete current original modules,
compilation profile and merged actual external tables. The API does not accept
caller-supplied tool proofs, even genuine ones from an earlier or different
external environment. New proof data is retained for review; public metadata,
source hashes and attribute spellings grant no permission. All existing original
attribute shadows, imports, source module views, configuration, prelude controls,
registered derive owners and independent output obligations remain required.

This is a noncircular composition. A same-scope derive/tool cycle cannot supply
an independently genuine initial tool proof and remains refused. Unknown
attributes, unresolved globs, missing modules and architecture type-prefix
closure also remain open. A non-trait architecture census does not establish
absence of a Rustfmt type binding. No provisional derive output or public
namespace-complete flag is introduced to bypass these prerequisites.

Complete original constructors and project consumer source are retained by the
ordered language/repository source producer, with native syntax selections,
serialized/reparsed whole CST equations and full inverses. Independent unrun
source checks original proof issuance, type/attribute shadows, actual external
binding changes, forbidden caller overrides, unresolved owners and same-scope
cycles. Default API stability and strict emitted project behavior also have
regression source. General bootstrap/export/producer closure, broader language
and resource domains, production adoption/parity and the remaining bulk ledger
obligations stay open. No test, translator, preparer, Rust tool or CI has run.
