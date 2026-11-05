# Consuming text core and builder source draft

All implementation and independent case/oracle SOURCE remains UNRUN. No local
tests, compilation, implementation/preparer/translator execution, performance
experiment or CI feedback inspection occurred. Full bulk drafting and complete
translation remain unfinished.

Two paired operations consume an actual owned String: append_owned retains its
native buffer while appending a borrowed suffix, and clear_owned retains native
capacity. JavaScript uses the existing primitive text ABI and Unicode/UTF-8 input
validation. The existing one MiB input/output contract remains explicit; suffix
length is checked before bounded native subtraction. No bound is raised and the
original unbounded application behavior is not thereby certified. Native capacity
retention avoids repeatedly rebuilding the native prefix, but JS validation still
reads the prefix and no end-to-end/amortized JS speed claim is made. Larger builder
optimization and bounded-domain application equivalence remain OPEN.

The actual forward checker now requires original checked by-value owned String
for those argument domains through its existing ownership issuer. Annotation,
spelling and equal primitive runtime representation cannot convert borrowed str
or waive live loans/moves. The existing full resource reverse contract catalog
registers both domains automatically, retaining fresh complete native/runtime/
declaration joins, state/loan checks, serialized/reparsed checked meta and full
canonical native reproduction. Ordinary/source-bound builder source proposals
now use consuming same-local assignments, including literal character rules.
No source/hash/owner/verdict/result cache crosses operations.

Nine whole compiler equations retain immutable originals, actual native owners,
language then repository sequences, full reparsed CST and exact inverses. Separate
complete native Rust source construction retains its original source archive,
private-to-public sequence, full inverses and joins the existing owned-copy native
history without changing old source bodies. The current checked native/runtime/
declaration closure is copied into receiving inputs; genuine owner/type/effect
issuers and the eight JS-before-fatal-Rust gates remain mandatory.

Independent unrun source includes Unicode/null/hostile/coercion/boundary runtime
cases, both APIs' existing complete builder caller corpus, JS/strict TS state and
ownership cases, complete canonical Rust inverse, forged meta/loan/move refusals,
native buffer pointer/capacity/clear and output-bound oracle, declaration/native
freshness and export closure. Full qualification, original unbounded parity,
namespace/producer closure, production coverage, wider source/reverse/sync/
freshness/receiving and delivery requirements remain OPEN.
