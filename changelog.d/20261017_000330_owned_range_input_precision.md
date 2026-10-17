The owned Rust inclusive-range function now accepts three values of the same
`Into<f64> + Copy` input type and explicitly widens each local to `f64`. This
keeps existing `Option<f32>` top-p and penalty callers compilable, including the
original rounding of unsuffixed endpoints in f32 before exact widening. Gemini's
f64 input keeps the same comparison. NaN, infinity and signed-zero behavior
remain IEEE ordered comparisons.

The complete Rust leaf and import-free source literal/hash change together.
The checked JavaScript/TypeScript operation remains restricted to genuine f64;
this does not admit f32 translation, generic trait dispatch or Rust library
internals. Existing f64 oracles are unchanged. Additional CI-only Rust oracles
compare authored f32 edge answers with original inclusive ranges, pin the exact
0.1f32 representation and cover the actual Option<f32>/Option<f64> call shapes.
The 0.1f32 equal-bound witness rejects an incorrect f64-endpoint implementation.
No Rust or JavaScript engine ran in the source worker.
