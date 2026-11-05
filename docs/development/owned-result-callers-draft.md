# Owned-success Result caller integration source draft

The copied 120-interface Result family now shares the existing actual caller
checker, callback checker, both interpreters and Rust/TS emitters. Forward
registration retains the complete copied native library and text dependency;
actual module-qualified dispatch keeps old and copied same-named operations
distinct. Standard Result success/error owners and concrete owned String types
still pass the original checks. All implementation and regression source is
unrun.

Borrowed-to-owned conversion is an explicit checked expression. It requires an
actual live or independently proved static borrowed source, qualifies the full
text-core boundary, and uses its existing bounded copy behavior in both emitted
languages and both interpreters. Owned parameter domains remain owned in Rust;
TS uses actual imported parameter queries to preserve that public distinction.
Callback error/success literals and owned optional constructors use the same
conversion rule. No null root or public metadata flag supplies a borrow proof.

Primitive and copied Result libraries share standard carrier layouts. Public
type proposals choose a complete available qualified boundary, and every actual
source import/type/body still checks its own library independently. Canonical
Rust inverse proposals retain owned input types and the selected type library;
fresh private checking and reproduction of the complete original Rust remain
mandatory. All library modules are excluded from caller restoration. The
choice and its temporary lookup state are confined to one invocation.

Twelve complete source predecessors preserve the two ordered rule sequences,
full CST/source inverses and adjacent histories. Independent source cases cover
JS, strict TS, both interpreters, whole native inverse, owned parameters, explicit
copies, empty/false/error variants, callback literals, optional owned values,
old/copied method collisions and escaping-owned-reference refusals. No case,
producer, translator, compiler or experiment has run. Wider owned lifetimes,
method adoption, actual production use, HTTP bodies and every other incomplete
requirement remain open.
