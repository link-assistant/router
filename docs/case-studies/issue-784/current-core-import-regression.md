# Check the current Schemars import route

Published forward job 128901874967 fails at whole-log line 3927 because the
Core candidate test expects all six original import families to relocate.
The actual enclosing producer now keeps Schemars on the independently checked
`schemars-enclosing-output-dispatch.mjs` route in both original and candidate
sources. That dispatcher chooses the original or `with` prover; each rejoins
the complete source/owner independently.

The test retains the five actual relocation checks and replaces the obsolete
sixth expectation with native TypeScript parsing of both complete sources.
Each must contain exactly the actual dispatcher import and all three original
bindings, with unchanged names. All existing native source-binding checks,
three complete source equations, API body checks, CST phases, inverses,
behavior/refusal cases, hook observations and deadlines remain required.

The original complete-file Node attempt hit the fixed resource guard after
102.459 seconds at 2,896,207,872 sampled cgroup bytes, before reporting a case.
Its complete streams, partial audit and child cleanup are preserved in the
[complete packet](evidence/current-core-import-regression.json.gz), along with
whole original/current test and producer/dispatcher sources. Every decoded
member passed length/SHA256 readback. The modified whole file passes syntax
checking; execution remains unrun after the assertion repair. Repeating the
same memory-heavy producer locally is not evidence of qualification.

No current receiving, full-gate, strict-parity or executable-gain claim is made.
No local Rust tool ran.
