# JSON object-view and shared-key source draft

All implementation and independent case SOURCE remains UNRUN. Full translation,
coverage, parity, synchronization, freshness and receiving qualification remain
unfinished. No local implementation, test, parser, translator, preparer, generator
or compiler was executed, and CI feedback remains uninspected.

The shared field selector reuses existing string-key interfaces for root
as_object/and_then(get) and nested get/as_object/and_then(get) chains. Only actual
canonical Json inputs and recognized canonical as_object paths or closed matching
callbacks qualify as source candidates. Optional callback braces and benign
closure shadowing preserve the complete original source. Extra keys may also be
immutable shared str input parameters, provided the callback does not shadow
them and the function has no competing binding for that input.

Canonical Value string get already returns None for nonobjects, so these bounded
object-view bridges require no new native/runtime API or pointer conversion.
Numeric string keys, slash, tilde, Unicode, absent/null/wrong-kind and receiver
borrowing retain the existing operation contracts. Unknown map producers,
effectful or unproved keys and array index shapes remain unselected. Additional
key parameters are eager source arguments only when their reads have no effects;
arbitrary key expressions remain in their original conditional position.

Two complete compiler source equations retain language then repository phases,
full serialized/reparsed CST and complete inverses, and every preceding source
history. Independent unrun source covers both adopters, root/nested/deeper forms,
shared keys, lexical refusals, fixed bulk JS/strict TS emission, consecutive text
adoption and native pointer/lifetime/expression oracles. Existing reverse field
interfaces and their independently drafted dynamic-key cases stay unchanged.
All whole-function type/ownership/source checks and all eight same-SHA JavaScript
gates before fatal CI-only Rust remain mandatory. Every wider ledger requirement
remains open.
