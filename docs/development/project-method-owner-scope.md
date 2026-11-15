# Method links retain their actual parser namespace

The owned project pipeline uses enclosing-namespace evidence for its source
items. Its original method parser independently captures full-bang evidence.
Those formats can legitimately differ: the source-proved Schemars `with` branch
closes the enclosing output while the unchanged full-bang API retains a residual.
The complete production library comparison found this difference only in
`rust/src/clients.rs`, at the actual `ClientKind` attribute. All 397 scopes and
their complete binding records were compared; the difference is the residual
diagnostic and the two macro-scope uncertainty fields.

Passing the enclosing record to the original method linker consequently failed
its mandatory complete-owner digest. The link now obtains the scope from
`originalMethodParserNamespace(matchesMacroContext,method)`, the existing private
method-context API used by that parser. It still requires the genuine original
method, complete source view, compilation profile and independently captured
context. Public hashes, copied scopes and caller flags cannot issue that proof.
The linker, its whole-owner digest, body/signature checks and refusal behavior
are unchanged.

The project still reports its actual enclosing source scopes separately. It does
not claim those records equal the parser's full-bang records. An unresolved bang
scope still refuses a method's `matches!` call, even when enclosing output is
closed. This repair supplies no macro expansion, type override implementation,
generated trait behavior or full parity.

The facade-retention producer composes a native-selected source recipe with its
original closure extraction. Only the actual private-context import and original
method link's binding-evidence expression change. The pinned complete original
archive, callable bodies, language/repository phases, serialized/reparsed CST,
native inverses and native binding verification remain mandatory. The exact
previous generated output remains a recognized predecessor; unknown source does
not become an accepted history layer.

`project-method-owner-scope.test.mjs` reproduces the original failure with a
complete small enum and method, checks JavaScript and strict TypeScript output,
and retains macro, attribute, configuration and changed-source refusals.
This controlled receiving case is separate from actual whole-project generation
and newly executable application counts. All ten complete method and compiler
receiving files pass 47 cases under Node with the independent deadline audit and
47 in fresh sequential Bun 1.4.4 processes. A combined Bun run hit the memory
guard; the separate passing processes preserve every whole file and deadline.
The facade-retention and owned-enclosing-binding generator checks both pass
separately. The production matrix, current source registry, generated translation
freshness and complete JavaScript gate still require execution.
