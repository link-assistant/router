Preserve source-only borrowed string lifetime metadata for written `&str`, written `&'static str`, and original string literals. Exact type tokens and spans survive checked IR; an outer shared reference retains the pointee's evidence without claiming that evidence describes its own lifetime. Generated literals and registered portable string hints receive no inferred static lifetime.

This metadata prepares a separate checked lifetime/elision verifier. It does not discharge escaping borrow, lifetime coercion or move obligations, and does not establish runtime parity.
