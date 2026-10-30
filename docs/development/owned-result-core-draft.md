# Owned-success Result compatibility core source draft

A separate complete copy extends the prior 88-interface native Result core with
32 owned-success operations for `Result<String, String>`. The resulting 120
interfaces include all 25 mapping and 25 binding pairs across booleans, signed
and unsigned integers, borrowed text and owned text. Every byte of the original
native implementation remains the prefix of the new module. The old native
module and its public behavior remain intact.

The runtime is a complete copy of the existing Result runtime. One
native-selected language rule validates the additional owned text payload
domain; repository rules publish the new interface names. It reuses the old
Result operation bodies. The catalog generates declarations, and complete
native-file/root/producer copies retain full source inverses and ordered
language/repository stages. Borrowed callback outputs keep their own lifetime
even when the consumed input success is an owned String.

Independent JS and Rust oracle source covers all mapping/binding pairs, exact
empty variants, captured output lifetimes, owned error recovery, strict payload
validation, resource limits and complete source histories. It is unrun. No
compiler, translator, preparer, runtime or test executed during drafting.
Actual owned-success caller/type/loan qualification, explicit borrowed-to-owned
substitutions, both directions/interpreters, assets/export closure, method
adoption and HTTP body use remain open with all other incomplete requirements.
