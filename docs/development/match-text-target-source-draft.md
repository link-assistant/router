# Closed match arm owning-text target source draft

All implementation and independent cases are SOURCE only and UNRUN. No local
parser/translator/preparer, test, compilation, experiment or CI feedback inspection
occurred. Full source drafting and complete translation remain unfinished.

The existing explicit owning String target reader now propagates its source
context through complete nonbinding match arm tails. A reusable language reader
selects exact scrutinee/body/arm boundaries before any arm publishes a target.
Closed patterns include literals, signed numeric literals, wildcard, Boolean,
qualified unit paths and nonempty alternatives of those forms. Complete block
arms can omit a comma where Rust permits it; other selected arms retain explicit
separation. Complete nested if/else, expression blocks and typed String local
initializers reuse the existing target reader and original text conversion rules.

This is source context, not inferred typing, Into dispatch, pattern type checking,
exhaustiveness or macro/namespace permission. Bindings, at-patterns, constructors,
guards, attributes, macros, malformed boundaries and other unsupported patterns
keep the complete match context unselected. The actual whole original caller
must still pass original name/type/trait/ownership/effect and target checks.
Neither a qualified pattern spelling nor an explicit output type supplies those
proofs. Unknown output types retain the original source. Existing 200000 source
cell, 64-depth and 512 arm bounds remain; failures propagate. No cross-operation
source/hash/owner/verdict/result cache or ABI change was introduced.

Four complete immutable compiler equations retain original source owners,
language then repository phases, full serialized/reparsed CST and exact physical
inverses. Independent unrun source covers both adopters, six complete callers/
thirteen edits, JS/strict TS Unicode/NUL/empty/numeric/branch behavior, exact
qualified/nonbinding/or-pattern bounds and malformed/refused scope classes,
original Rust owning-match semantics and export closure. Broader pattern bindings,
guards/iterator/mutation combinations, namespace/producer closure, production
coverage, complete forward/reverse/sync/freshness/parity, receiving/performance
qualification and delivery remain OPEN. No executable coverage increase is claimed.
