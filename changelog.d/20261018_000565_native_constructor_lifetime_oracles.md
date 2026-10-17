Extend the native compatibility-core reader oracle with static-first and
borrowed-first Option/Result payloads, nested success/error values, Unicode,
filter receiver/predicate order, None laziness, and genuine static nominal
fields and fallback values. Keep all eight existing native oracle cases.

The additional Rust cases run in CI only. They are independent native behavior
evidence, not translation admission or a local Rust execution claim.
