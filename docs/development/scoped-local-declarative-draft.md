# Inline textual macro source draft

A separate copied source adapter and project entry extend the existing plain
root macro lane to actual inline module scopes. Each genuine original module
view keeps the complete original file, declaration interval, body and absolute
positions. A child inherits only definitions preceding its actual declaration.
Local definitions shadow inherited names within that child and its descendants;
they cannot escape into a parent or sibling. Unknown child producers also
conservatively invalidate later parent candidates until a fresh definition.

The actual private matcher/transcriber engine, opaque fragment forwarding,
source-order selection, disjoint captured/literal identifier hygiene and all
original resource bounds remain. Inner or outer unresolved attributes,
macro_use, qualified calls, generated macro definitions, dollar-crate owners
and unknown nested producers retain complete source and explicit refusals.
Function-local block scopes and external-file textual inheritance remain open.
The original root-only APIs and their behavior stay available.

The copied project entry captures and freshly rejoins every original source,
serializes/reparses the original and expanded CST, and re-enters the original
Rust frontend, independent checked semantic meta and both target emitters.
It distinguishes expanded-source compilation from original-source semantic
qualification. No lexical expansion record grants namespace/type/owner proof,
production coverage or native parity. Complete architecture exports and
attribute/derive producer bootstrap still require their independent closure.

Three complete original copies, ordered language/repository rules and full
inverses are retained. Independent inherited/shadowed/nested/sibling/order,
source-position, original-API, unknown-producer, hygiene, attribute, complete
project JS/strict TS and real native textual-scope oracle cases are drafted
and unrun. No implementation, test, experiment, compiler, translator, preparer,
generation, Rust tool, push or CI was executed during drafting.
