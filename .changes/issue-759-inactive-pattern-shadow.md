Independent PatternControl coverage now executes a qualified standard Option
pattern in the presence of `#[cfg(any())] mod std {}`. That module is proven
inactive by the Rust cfg grammar under both default and explicit production
profiles, so it cannot shadow the actual standard owner. Emitted JavaScript and
strict compiled TypeScript produce the literal Some/None outcomes.

Active `cfg(all())`, unknown `cfg(unix)` and unresolved `cfg_attr` std modules
still refuse the same constructor path. Source ownership checks are unchanged;
only the stale inactive-module expectation was corrected.
