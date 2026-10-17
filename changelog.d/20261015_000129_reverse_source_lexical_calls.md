Added source-bound lexical callable creation and direct-call IR prerequisites for
the reverse translator. The checker reconstructs the complete original caller,
its immutable parameter captures and every const-local callable use before either
target consumes the reparsed meta document. Escaping, aliased, mutable, early,
effectful and unknown calls remain refused.

Owned dense literal `some` uses explicit ordered short-circuit iteration and
retains a conditional standard-intrinsic obligation. This prerequisite does not
establish a string-only contract for the original resources `terminates` helper,
admit its I/O parents, compile Rust, or establish complete runtime parity.
