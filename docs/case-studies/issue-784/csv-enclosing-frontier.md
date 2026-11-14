# Original CSV enclosing-owner diagnostics

`experiments/issue-784/probe-csv-enclosing-owners.mjs` reads each complete,
unchanged historical parent and original Cargo inputs used by the CSV regression
file. It constructs the genuine derive and enclosing-only contexts in a
one-file module graph. It does not replace the original whole-library test,
prove ancestor completeness or produce executable declarations.

The following initial observation predates the current enclosing Clone repair.
Its complete `config.rs` source SHA256 remains
`9f5bb5c2d7060a8ab317889e401d3da2155a0574b5d4e2ed112f52d5e9468d8a`.
Four of its five derive invocations close in the existing enclosing-only format.
`RouterOptions`, span 6702–12665, retains its actual `Clone` invocation and
refuses with `Clone positive AST validation budget exceeded`. No budget or
legacy API was changed. Context construction takes 10,089.23 ms; the whole
invocation, including original module loading, takes 40.89 seconds and samples
2,018,344,960 bytes of container memory.

The complete `associative.rs` source SHA256 remains
`ed0ece47432947d26bd5c026ab6bbf4a9efd7e415deeca6424213ff836f450d1`.
Its actual derive invocation, span 1051–1170, remains unresolved: Debug, Clone,
PartialEq and Eq retain an unresolved generated-attribute ancestor; PartialOrd
and Ord require a nonempty ordinary unit enum in the current source route.
Context construction takes 5,409.34 ms; the whole invocation takes 38.90 seconds
and samples 1,614,491,648 bytes. Both original complete outputs, commands and
memory receipts are retained; both owned process trees exit normally.

The later current-fixture probe preserves the same complete source and closes
all five actual `config.rs` enclosing derive invocations, including
`RouterOptions`. Context construction takes 8,144 ms; the complete diagnostic
takes 40.032 seconds and samples 2,197,155,840 cgroup bytes. The corresponding
current associative probe still refuses the same actual `SemanticLink` derive:
the ordering route requires a nonempty ordinary unit enum. Its context takes
5,547 ms. Neither process success grants semantic closure. The
[ordinary parser repair](ordinary-parser-enclosing-20261110.md) records the
separate current compiler probe and whole focused receiving results.

These diagnostics establish zero newly executable production functions. A
future source-backed extension still needs all actual owners and ancestors,
whole original CSV behavior/deadlines, genuine generated artifacts and the
complete JavaScript gate. The existing historical pins and refusals remain
required.
