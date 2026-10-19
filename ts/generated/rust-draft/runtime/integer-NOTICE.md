The fixed integer adapters were independently implemented in JavaScript from
the public parsing contracts and inspected Rust 1.89.0 core numeric source.
They preserve checked digit/overflow ordering and the pinned ParseIntError
categories and Display strings. They do not copy a Router function body.

The referenced Rust source is distributed under MIT OR Apache-2.0:
https://github.com/rust-lang/rust/blob/1.89.0/LICENSE-MIT
https://github.com/rust-lang/rust/blob/1.89.0/LICENSE-APACHE

Exact source blob identifiers, target assumptions and validation limits are
recorded in ../fixtures/rust-integer-sources.json. Stable radix parsing and
the FromStr trait have separate const eligibility. No Rust execution or
whole-program equivalence is claimed.
