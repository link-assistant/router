Drafted generic Rust `for` pattern translation through checked meta-language to
JavaScript and TypeScript. Written reference patterns retain their original
tokens and require an actual shared reference item before the existing primitive
Copy contract can bind its pointee. Tuple, constructor and wildcard patterns reuse
the checked irrefutable binding planner; iterator and callback bodies remain
unchanged. Generated input names avoid original identifiers.

Eight authored cases are pending execution, including strict TypeScript/runtime
checks, lazy overflow and loop control, source/meta preservation and invalid
owned/reference/aggregate patterns and actual constant/constructor owner guards.
Borrowed tuple destructuring, aggregate Copy,
mutable per-field binding and complete runtime parity remain unproved. No Rust
build, producer run or parity promotion accompanies this source-only draft.
