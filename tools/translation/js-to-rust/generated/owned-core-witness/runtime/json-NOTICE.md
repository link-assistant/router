The checked JSON adapters implement contracts inspected in the local source of
serde_json 1.0.151, as pinned by this repository's Cargo.lock, and its formatter
dependency zmij 1.0.23. No Rust executable was used to validate these adapters.

The byte decoder and default numeric accumulator in json-parser.mjs and
json-numbers.mjs adapt algorithms from serde_json src/de.rs and src/read.rs.
serde_json is copyright its contributors and distributed under MIT OR Apache-2.0.
This copy uses the MIT license reproduced in json-LICENSE-MIT.txt.

The shortest binary64 decimal selector uses independent BigInt rational
arithmetic. Its notation thresholds follow the inspected zmij 1.0.23 f64
formatter: fixed exponents -5 through 15, signed scientific exponents, and an
explicit decimal fraction for integral floats. No zmij implementation is copied.

Source hashes, selected contract references, feature assumptions and validation
limits are recorded in ../fixtures/rust-json-sources.json. In particular, these
fixtures do not establish differential equivalence against every Rust float,
every malformed input or a complete Router program. Mutable Value borrows and
arbitrary derived serde types require their own frontend checking.
