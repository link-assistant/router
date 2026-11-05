# Borrowed repetition and static text reverse source draft

SOURCE ONLY. No compiler, parser, translator, preparer, tests or experiments ran.
CI feedback remains uninspected; full source drafting and delivery continue.

Qualified vec repetition now admits the existing checked Copy borrowed-str
profile. It reuses the exact existing repeat checker, once-only seed evaluation,
count/source bounds and original lifetime machinery. The array retains the
existing repeatSeed field under its genuine private owned-vector association.
Zero stored elements still read that seed's borrow origin, so neither a return
nor an unused annotated local can silently widen an input borrow to static.
Owned String Clone repetition and aggregate references remain separate rules.

The explicit reverse vector candidate adds only actual source-qualified static
str elements/arguments. Both the written and checked native return/parameter
profiles must carry the original static borrow. String literal seeds retain
their actual static source origin. Unknown, elided, named-generic or erased
borrow lifetimes are not upgraded by JavaScript strings or public metadata.

Rust emission uses literal static str storage and explicit &'static primitive
str arguments. It creates no owned String or artificial leak. Repeated static
borrowed input positions reuse the by-value native shared reference. JS/TS use
Unicode-scalar primitive strings and the existing validation closure, including
unused inputs. General borrowed reverse dataflow remains OPEN.

Eight complete compiler equations preserve full originals, language/repository
sequences, complete CST inverses and both preparation roots. Independent unrun
source covers actual borrowed/static repetition, zero-count lifetime mismatches
in returns/locals, strict TS/reverse/evaluator, original static signatures,
Unicode input guards, nonstatic source refusals and native shared-storage oracle
source. Full lifetime/platform/receiving qualification, all production callers,
forward/reverse/sync freshness and every delivery requirement remain OPEN. Rust
stays CI-only after eight same-SHA JavaScript gates.
