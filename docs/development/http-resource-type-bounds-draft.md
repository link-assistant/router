# Original generic alias bounds and defaults draft

Actual generic type aliases now support constraints resolved from their original
native type nodes and trailing defaults, including references to earlier slots.
Each actual argument is freshly checked against the complete constraint
descriptor; ownership distinctions and operation signatures remain exact.
Defaults must satisfy their original constraints even when an alias is unused.
Unknown bounds, forward/self slot references, invalid arity, declaration cycles
and unsupported constructors retain explicit refusals.

Known callable constraints support parameter/return queries and bounded indexed
domains. Symbolic declaration checks retain actual original constraint nodes;
unconstrained slots cannot borrow a same-named global alias. Real instantiations
still use the actual argument nodes and lexical environments and re-enter the
complete original body/domain/source checks. No symbolic slot or descriptor
issues executable or native authority. The original generic deferred factory
rule remains separate and complete.

Source-unit retention now selects queries from the entire alias declaration,
including constraint/default clauses. Imports are rebound to their actual
operation owners after JavaScript or Rust edits, then the entire new TypeScript
target must reproduce the authoritative Rust. Full original declarations,
complete CST inverses and original transaction/conflict safeguards remain.

Complete original helper/caller/retention/test source, both ordered substitution
sequences and independent unrun JS/strict TS/physical source-unit cases are
retained. The prior valid primitive constraint/default source cases now have
explicit positive cases; malformed bound/default refusals stay independent.
No test, compiler, translator, preparer, runtime or Rust tool executed. This is
a type-only extension; generic executable functions, general constraints,
variance/methods, namespace/bootstrap, full production parity and every other
unfinished bulk requirement remain open.
