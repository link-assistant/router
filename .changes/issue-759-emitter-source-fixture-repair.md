Fix repeated pattern emitter adapters by keeping their expression dispatch local to each adapter. Update source-derived type expectations to retain checked Rust provenance, and preserve ambiguous tuple lifetime syntax as an explicit refusal while correcting the positive synthetic fixture.

The combined repair matrix passes 115 tests in Node and 115 in Bun, including generated JavaScript and strict-compiled TypeScript behavioral checks. Original production Rust bodies remain unchanged; complete parity is still gated by the full regeneration and strict checks.
