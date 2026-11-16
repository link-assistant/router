# Group complete source-preparation transactions

`prepare-primitive-identity-boundary.mjs` now uses the existing complete
`transportConcreteSourceEquations` operation for each pinned whole source.
Its actual language phase retains the original source; its repository phase
applies the complete checked edit. The operation independently constructs and
serializes/reparses both complete CST documents, runs the substitutions and
checks the complete canonical inverse. Both native AST copies, original archive
pins, source selections, runtime guards and actual generated source bytes remain
required. No source, hash, owner or result cache is added.

`concreteTransaction` retains the executed equation. The existing stage records
are views of those executed phases: the language view has an identical before
and after document, and the repository view has the original and edited
documents. They do not claim separately dispatched standalone CST transactions.
The public standalone CST validators and the translation runtime are unchanged.

The previous complete source-composition case passed its assertions in 69.314 s
and failed its unchanged 60-second audit. CPU sampling found 31.678 inclusive
seconds in private source authentication and 9.717 self seconds in expected
prototype descriptor checks. These are sampled observations, not independent
additive totals or a controlled end-to-end speed claim. The complete nine-case
composition/metadata/equation group now passes the original Node deadline audit;
the equivalent Bun group passes too. Complete failed and passed streams remain
retained separately.

The current source composition also includes the existing string-operation and
primitive metadata-copy layers. Their complete preceding sources and inverses
remain checked; omitting these layers produced stale generated-source failures.

## Canonical development-source profile

Bun rewrites the loaded TypeScript compiler's callable source spelling, including
block and declaration formatting. The development source producer therefore
obtains its canonical Node.js profile in a fresh bounded Node process when run
under Bun. The child checks the complete pinned TypeScript 5.9.3 source and
produces DATA only. The parent rejoins every recorded complete native source
span, source hash and version before its normal whole-source CST/native checks.

The child has a 20-second deadline and 8-MiB output cap and is included in the
parent's aggregate resource observations and original case deadline. Node 20+
is an explicit source-preparation dependency. No application runtime is moved
to Node. The emitted runtime's original identity guard and complete parser
fallback remain unchanged; optional fast-path eligibility does not grant DATA
preparation, namespace or executable authority. Source output and target behavior
still require independent receiving checks and the complete same-SHA gate.
