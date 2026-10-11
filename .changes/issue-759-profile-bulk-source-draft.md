Draft a reusable full-corpus translator for explicitly selected compilation
profiles. A privately captured, bounded corpus retains complete original Rust
and Cargo bytes, including sparse tracked inputs. Every profile builds its own
module, namespace, type and effect contexts and emits meta-language, JavaScript,
TypeScript, runtime assets and an inventory under its exact profile digest.
Prepare every output plan and validate isolated paths before writing any
profile; ordinary neutral outputs remain separate. Drift checks preserve all
missing, stale and unexpected paths. Source sets, matrix membership, required
profiles and translator implementation hashes remain in the inventories.
No profile-independent executable, complete platform domain or native parity
is claimed. The reusable translator CLI supports an explicit --profile-matrix
write or drift-check cycle. Nine newly authored source-corpus and bulk-profile tests are
unrun. This source-only draft depends on the pending compilation-matrix helper;
no compiler, corpus producer, full gate or local Rust build ran on it.
