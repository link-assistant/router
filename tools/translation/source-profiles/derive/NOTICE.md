These compressed source inputs are compiler proof fixtures, never installed or executed. The archive checksums match Router's Cargo.lock. The manifest records the exact audited source members and dependency/feature identity. Hash verification is mandatory before a certificate is created.

Serde and serde_derive 1.0.229: Copyright (c) 2014 The Rust Project Developers; MIT OR Apache-2.0. Schemars and schemars_derive 1.2.2: MIT, copyright and full license are retained in each original archive. serde_derive_internals 0.30.0, syn 3.0.5, quote 1.0.47 and proc-macro2 1.0.107: MIT OR Apache-2.0; each original archive retains its license files and notices. Rust 1.89.0 core macro source: Copyright The Rust Project Developers, MIT OR Apache-2.0, https://github.com/rust-lang/rust/tree/1.89.0.

The contract concerns the lexical namespace footprint of bounded derive inputs. It does not implement Serde serialization, deserialization, Schemars schemas or any generated trait methods. Unknown inputs and incomplete macro closures remain explicit obligations.

The builtin-default-manifest.json profile additionally retains compressed original Rust 1.89.0 core Default and compiler derive sources, Copyright The Rust Project Developers, MIT OR Apache-2.0. Its bounded all-unit enum profile preserves one plain default helper and unchanged layout; the generated Default trait implementation is not lowered or executed.

Clap, clap_builder and clap_derive 4.6.7 and Heck 0.5.0: MIT OR Apache-2.0; the complete unchanged original archives retain their license files and notices. These added archives match the existing unchanged Cargo.lock. Original Clap quote templates and Heck ASCII casing rules supply bounded ValueEnum source-output syntax evidence, without implementing trait methods or CLI/schema execution.

The bounded Args frontend additionally audits the original value_parser declarative macro and Heck shouty-snake member from those same unchanged archives. Source quote and expression-block expansion evidence does not implement Args/FromArgMatches or parser execution.
