# Immutable JSON reader source alias draft

All new implementation and independent cases are UNRUN. Only source construction
and review occurred; no alias walker, parser, adopter, compiler, preparer, tests,
experiments, generation, Rust tool or CI-triggering push executed.

The complete canonical reader selector now follows immutable source aliases and
ordinary same-name let bindings after their complete initializer. A bounded
lexical walk clones candidate environments on original braces, restores parents
on exit and installs a pending binding only at its original statement semicolon.
It never observes the new binding in its own initializer.

Closed inference covers known shared JSON inputs, existing get/as_object/as_array
chains, matching canonical collection reader function items, Option question
marks, matching written annotations, borrowed string keys and contextual or
explicit usize indices. Each alias retains its complete original statement,
initializer span, input root and finite source chain; source metadata provides
no native binding, type, loan or executable authority. The direct index selector
also retains the valid 0_usize spelling.

Mutable/destructured/conditional/callback/match binders remain conservative;
ambiguous alias names are blocked throughout this source operation. An unknown
ordinary initializer clears the role at its declaration. Canonical owner names,
local producers and original closure/conditional formal shadow guards remain
independent. Source-role chains stop at 32 links, and token/inference/environment
copy work shares a 200000-cell budget. No environment or verdict crosses
operations. All original whole-source, Cargo, facade and semantic checks remain.

Three complete compiler equations preserve original modules and native owner
spans, separately ordered language/repository rules, serialized/reparsed CSTs
and complete physical inverses. Both materialized and detached packet entry
points use the same selector. Independent unrun source, JS/strict TS and CI-only
native cases cover lexical restoration, ordinary formal shadow, missing and
Unicode data, typed aliases, contextual indices, original borrowed storage,
unknown replacement, ambiguous binders, bounds and complete inverses.

Native owner/loan/dispatch equivalence and actual production admission remain
unqualified. Wider alias forms, scalar aliases after a completed reader, general
mutation, complete namespace closure, source-bank/export freshness, full forward/
reverse synchronization and parity, eight JavaScript stages, gated Rust CI and
receiving qualification remain unfinished with every other bulk requirement.
