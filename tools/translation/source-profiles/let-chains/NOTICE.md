The complete original Rust 1.89.0 rustc_ast_lowering expression source is
retained once in ../while-let/rustc-lowering-expr.rs.gz, with SHA256 and Git
blob identities verified by this profile. Its MIT OR Apache-2.0 licenses are
retained in ../copy-standard/LICENSE-MIT and LICENSE-APACHE.

Original lower_cond recursively lowers && containing let expressions,
retains the original let initializer, and bounds other condition temporaries.
The portable draft admits only already-checked immutable/shared Copy pattern
domains and unit statement joins. It lowers their actual source clauses into
the shared checked control IR, before serialized/reparsed target emission.
The grammar profile is Rust 2024. Admission requires a private context
captured from the complete original Cargo manifest with one explicit package
edition of 2024. Absent, different, inherited, duplicate and unproved key
identities stay refused. This bounded edition extraction does not validate
complete TOML or resolve workspace inheritance. Cargo source coordinates stay
in their original UTF16 space through Rust item/module relocation.
Source coordinates and the complete input remain evidence rather than
ownership, Drop, namespace, const or whole-compiler translation authority.

All new let-chain behavior and controls are unrun at this draft stage.
