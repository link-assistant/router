Added an independent Rust integration-test source for the original public
thinking numeric-suffix parser, matching the new JavaScript expectations for
u32 boundaries, signed zero, malformed prefixes, whitespace and Unicode digits.
Cargo's default integration-test discovery and the existing complete CI Rust
test command select this target. No Rust tooling or execution ran locally;
execution remains reserved for CI after the complete JavaScript gate passes.
