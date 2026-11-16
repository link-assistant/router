# ASCII and split method adoption source draft

Every new implementation and case is UNRUN. Only source construction and review
occurred; all tests, experiments, translators, preparers and generation remain
deferred until every source requirement is drafted. Rust remains CI-only after
the complete same-SHA JavaScript gate.

The existing immutable-text adoption selector now covers the seven direct ASCII
methods and four exact first/last split projections. A projection must contain
the complete `.split_once(pattern).map(|(left, right)| left)` form, or its exact
right/reverse equivalent. Both bindings must be ordinary identifiers or an
unused underscore, and the returned binding must be an actual non-underscore
member. Arbitrary closures, extra statements, effects, move captures, duplicate
bindings, unknown outputs and non-string patterns remain unsupported.

Only the two pipe tokens of a complete selected projection are exempted from
the existing unknown-closure refusal. Every other original producer, mutation,
shadowing, trait and module/context check remains. The additional source scan is
charged to the existing 200,000-cell bound, without extending limits.

Recognized owned-text results may be borrowed by a later text operation in the
same expression or through an immutable inferred local. The replacement borrows
that complete receiver exactly once. This is a source candidate, not a lifetime
or dispatch proof. Complete original whole-function source/type/ownership/effect
checking still decides whether an installation is allowed. Historical native
dispatch and Drop timing remain explicitly unqualified in proposal metadata.

The original corpus, compressed-packet, selected plan/apply and source sequence
paths all use the extended selector, retaining separate language/repository
rules, current input checks, complete CST serialization/reparsing and inverses.
Two complete compiler equations retain original implementations and native owner
spans. Independent unrun cases cover eleven shapes, owned temporaries/locals,
refusals, JS/strict TS and native original/adopted chains. No production files
are changed by constructing this implementation. Actual current adoption,
coverage/parity, namespace closure and every unfinished ledger row remain open.
