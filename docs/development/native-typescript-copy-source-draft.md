# TypeScript native source construction draft

SOURCE ONLY, all new cases UNRUN. No local tests, compilation, parser/translator/
preparer execution, experiments or CI feedback inspection performed. Complete
source drafting and full translation remain unfinished.

The original source-copy constructor now shares the existing source-history
language classifier when selecting native TypeScript parser kinds and complete
CST equations. Both per-file and invocation-local batched lexical binding checks
parse ts/mts/cts modules as TypeScript. JavaScript paths retain the original
JavaScript parser choice. Native Rust continues through its separate source path;
this change does not parse Rust as JavaScript or issue native Rust permission.

Both fixed language/repository phases, complete source/rule archives, current
file and dependency checks, native AST-selected owners, full serialized/reparsed
CST and source inverses remain intact. Later histories keep their actual source
language. Original TypeScript version, missing/duplicate/initialization scope
checks and strict-check distinction remain unchanged. No input language choice,
CST record or source hash supplies semantic or executable authority. Existing
per-operation parser sharing remains bounded and cleared on all exits; no new
cross-operation source/hash/owner/verdict cache is introduced.

Four complete implementation equations and independent unrun receiving source
cases cover JS, TS, MTS and CTS, readonly types, BigInt, Unicode UTF16 positions,
original native function ownership, both substitution phases, physical input
preservation and inverse/export history. These source cases do not certify strict
TypeScript, generated runtime parity or receiving qualification. All complete
verification and wider namespace/production/sync/parity/delivery stay OPEN.
