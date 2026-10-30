# Native source owner index draft

The source copy preparer now walks a substitution step's actual native syntax
tree once to locate the requested functions, classes, imports, calls, member
calls and variable declarations. Each edit still independently requires its
original exact source span and expected bytes, unique native owner, complete
owner containment and nonoverlap. Module-end insertion has its original exact
end/empty-source requirement. Both original phases still parse their complete
before/after sources and retain full serialized/reparsed CST inverses.

The temporary index contains actual AST nodes and lives only inside one
substitution step. It retains no source/hash/owner/verdict/result state across
invocations and cannot supply type, semantic, namespace or executable proof.
Complete original/rule archives, physical originals, all descendant histories,
physical source rechecks, copied-source binding checks and original bounds
remain required. No test workload, case deadline or CI stage has changed.

Two complete source originals and both ordered sequences retain exact inverses.
Independent regression source covers all 128 original edits, exact per-edit
spans, escaped owners, duplicate definitions, stale literals, overlap, every
owner category, source changes in one operation and exact EOF boundaries.
All cases and performance remain unrun; this is a source-derived repeated-work
reduction, not a measured speed claim. No compiler, test, experiment, preparer,
translator, generation, Rust tool, CI job or push was executed during drafting.
Remaining history/performance failures and every bulk requirement stay open.
