Drafted generic Rust `for` pattern translation through checked meta-language to
JavaScript and TypeScript. Written reference patterns retain their original
tokens and require an actual shared reference item before the existing primitive
Copy contract can bind its pointee. Tuple, unit and wildcard patterns reuse the checked
irrefutable binding planner; iterator and callback bodies remain unchanged.
Constructor syntax preserves original tokens, while nominal iterable moves stay
refused. Generated input names avoid original identifiers. Mapped anonymous
products reuse the bounded tuple checker and actual primitive field identities.

Nine authored cases passed in the complete paired 167-test focused scope,
including strict TypeScript/runtime
checks, lazy overflow and loop control, source/meta preservation and invalid
owned/reference/aggregate patterns and actual constant/constructor owner guards.
Source review corrected the earlier unrun constructor-positive fixture: its
nominal mapped result had no checked move contract. The earlier drafts remain in
Git history; no runtime attempts or logs existed to replace.
Borrowed tuple destructuring, aggregate Copy,
mutable per-field binding and complete runtime parity remain unproved. No Rust
build, producer run or full parity promotion accompanies this focused batch.
