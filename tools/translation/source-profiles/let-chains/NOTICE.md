The complete original Rust 1.89.0 rustc_ast_lowering expression source is
retained once in ../while-let/rustc-lowering-expr.rs.gz, with SHA256 and Git
blob identities verified by this profile. Its MIT OR Apache-2.0 licenses are
retained in ../copy-standard/LICENSE-MIT and LICENSE-APACHE.

Original lower_cond recursively lowers && containing let expressions,
retains the original let initializer, and bounds other condition temporaries.
The portable draft admits only already-checked immutable/shared Copy pattern
domains and unit statement joins. It lowers their actual source clauses into
the shared checked control IR, before serialized/reparsed target emission.
The grammar profile is Rust 2024, matching Router's Cargo manifest. Admission
for repositories selecting other editions has not been proved.
Source coordinates and the complete input remain evidence rather than
ownership, Drop, namespace, const or whole-compiler translation authority.

All new let-chain behavior and controls are unrun at this draft stage.
