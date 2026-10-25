# Original native Some/None let-else draft

The explicit native source path now recognizes an actual immutable Some pattern
with one ordinary binding and an otherwise block containing exactly a None
return. The initializer resolves before the new binding. Exact constructor and
delimiter substitutions replace that declaration with checked Option propagation;
the entire normalized body still re-enters the original type/move/root checker
and must reproduce its complete native projection.

The original lexical scope must leave Some and None unshadowed. Ordinary
bindings named after prelude constructors or Box now conservatively refuse
rather than being renamed into valid value declarations from an unproved Rust
pattern. Changed fallback values, cleanup/effects, mutable extracted payloads,
nested patterns, unknown owners and incomplete original syntax retain refusals.
Original fallback and pattern trivia remain in exact full-source inverses.

Three complete original source copies, both substitution phases and full
inverses are retained. Independent JS/strict TS/native, absence, Boolean,
signed/unsigned range, owned text, sequential move/scope, source/refusal and
real native drop oracle cases are drafted and unrun. No tests, experiments,
compilers, translators, preparers, generation, local Rust tools, pushes or CI
ran. Wider patterns/fallback cleanup, namespace/producer closure, production
adoption/parity and every unfinished bulk requirement remain open.
