# Native primitive value definition header source draft

All implementation and cases UNRUN. Full drafting and full translation remain
OPEN. This source-review follow-up closes two draft wiring gaps: the scalar-only
native header mode refused genuine Vec helpers, and canonical input-validation
statements were unsuitable as bodies of new internal helper definitions.

The original complete private emitter is copied into a separate header source
procedure. The original public emitter, scalar-only header option and all their
refusal contracts remain unchanged. The new entry independently rechecks the
complete program, requires actual native scalar/expression-vector origins, exact
Boolean/fixed scalar parameters and exact scalar/owned primitive Vec results.
It retains the original source and context joins, actual helper closure, body
emission, precise type aliases, byte formatting and final current-source fence.
There is no public already-checked flag and no cross-operation cache.

This explicit TypeScript source constructor emits actual complete internal
function bodies and their precise headers without public boundary statements.
Both the existing scalar-only helper bootstrap and additive Vec bootstrap use
it, then reconstruct the complete typed/JSDoc source and reissue it through the
private new-definition checker. Actual prior native helper bodies and ABIs are
compared afresh. This source is DATA, not an installed/executable product output.

The final public source still goes through the unchanged ordinary emitter and
complete native/receiving checks, restoring validation for every original and
added public function. Omitting validation in a temporary helper body does not
omit, weaken or qualify final runtime input checks. Borrowed text inputs and
broader helper domains remain separate OPEN requirements.

Five complete source equations preserve full originals, serialized/reparsed
lossless CST/meta, inverses and language then repository phases. Draft cases cover
mixed native headers, original scalar header refusal, JavaScript and TypeScript
helper bootstrap for both families, full extension with restored public boundary
behavior, native/empty/forged input refusal and exact source equations. All strict
receiving/parity/freshness/performance/platform/export/CI evidence remains OPEN.
No local tests, compiler or translator ran and CI feedback stays uninspected.
