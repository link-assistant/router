# Checked owned String state source draft

All new implementation and independent case source remains unrun.

Mutable local state now includes actual owned String values produced by the
existing checked compatibility operations. Assignment must retain that exact
domain and cannot invalidate any live original borrowed view, including a view
whose other possible root is a different input. Borrowed string inputs and raw
literal initializers do not silently become owned values; explicit matching
operations retain their original bounds and behavior.

The source checker permits reinitializing an already moved mutable String slot
after its original value has moved to another owner. It checks the complete
right-hand side, prohibits live backing loans and restores the initialized
owned state only after the new value satisfies its full domain. Duplicate moves,
borrowed escape and implicit ownership conversions keep their refusals.

Loopback invariants retain the same type, initialized state and roots across
iterations. Ephemeral inline views may feed an owned result before assignment;
named live views conservatively prevent replacement until their scope ends.
This is not a general nonlexical lifetime or exception/unwind proof. Resource
and other owned mutation still require separate complete rules.

The complete native projection preserves mutable owned String bindings and
assignments only where the fresh whole source checker accepts them. Exact whole
native reproduction remains mandatory. Full original flow/projection sources,
ordered native substitutions and complete source/CST inverses are retained.

Independent source cases cover repeated Unicode state, zero iterations, moved
slot reinitialization, inline views, borrowed initialization, live first/second
roots, borrowed escape, canonical whole native reproduction and actual JS plus
independent strict TS. Handwritten native source is an independent oracle for
JavaScript-gated CI. No translator, preparer, installer or test was run.

Abrupt/exception exits, general resource/collection state, wider loops and
language/async domains, namespace/bootstrap, production adoption/parity and every
unfinished requirement remain open.
