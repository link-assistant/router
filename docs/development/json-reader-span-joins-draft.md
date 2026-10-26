# JSON reader span join source draft

All new changes and independent cases are UNRUN. Source inspection found two
repeated whole-collection/string operations inside per-edit loops. This source
draft removes those local repetitions without executing a proposer, compiler,
preparer, benchmark, experiment, tests, generation, Rust tool or CI-triggering push.

The repository binding stage filters the actual intermediate mapping once,
requires its complete substitution count to equal the selected edit count, then
checks every original expected/replacement pair and generated path as before.
The complete source inverse checks every replacement slice against the unchanged
final source and assembles original text once from ordered pieces. It retains the
final exact inverse comparison; all source, ordering, overlap, hash, CST/meta,
phase and semantic guards remain in place. Temporary arrays stay inside this
single file operation, with no cross-operation source or verdict cache.

Two complete compiler equations preserve original whole functions/modules,
native owner spans and separately ordered language/repository substitutions.
Independent unrun cases retain mixed bulk UTF16/CRLF edits, different nested
default shapes, every mapping and both staged inverses, plus empty stages and
unchanged source. No measured performance, case-deadline qualification, caller
admission, freshness, parity or completion result is claimed. All remaining
source and verification requirements stay open.
