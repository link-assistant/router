Add reusable checked type plans for Option.map, Result.ok and bool.then. Plans require standard generic provenance, resolved constructor fields and matching type arguments; callback checking and canonical Option instantiation remain explicit frontend steps with no Rust body substitution.

Keep the primitive Rust owner in the independent expected type records when the checked frontend preserves rustPrimitiveName. Exact plan assertions continue to verify the complete type provenance.
