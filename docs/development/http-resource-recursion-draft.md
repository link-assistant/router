# Explicit synchronous recursive helper source draft

All new implementation and independent case source remains unrun.

The source call graph now retains strongly connected groups of actual ordinary
function declarations. The existing acyclic ordering API keeps its old default
refusal for recursive graphs; the whole source adapter selects explicit groups.
Each recursive member must have its own original JS JSDoc or TS return
annotation. Only synchronous scalar inputs and Boolean, u64, owned String or
unit returns enter this restricted group rule.

Actual declarations establish local function bindings; written recursive types
are obligations. The checker makes those type signatures available while
checking the group, independently checks every complete original body and
requires all inferred returns to satisfy the declared domain. No module is
emitted unless every body succeeds. A claimed bigint cannot waive the existing
numeric argument guards or checked result domains, and a claimed String cannot
turn a borrowed input into owned output. Resource inputs, returned loans,
asynchronous recursion, missing annotations and wider signatures remain refused.
This rule supplies no original Rust macro/namespace/attribute-owner proof.

The original source's explicit return token spans determine native JS erasure
and strict TS annotation insertion. Complete CST and source inverses retain all
original annotations and trivia. The TS source projection proposes actual
return annotations in JS when a TS source has no return doc or has a differing
doc, retaining the authoritative TS bytes and full comment-token inverse. This
keeps the generated JS eligible for a later fresh recursive source translation.
The canonical native inverse proposes actual return annotations from its
complete native signature DATA, then rechecks the
entire source group and reproduces every authoritative Rust token. Signature
DATA alone supplies no checked body, ownership or runtime permit.

The graph traversal retains original cell/depth bounds, source order and
per-invocation tables. Every meta read rechecks all bodies and original source.
Complete original grouping/adapter/projection modules and native-selected
ordered substitutions retain full originals and inverses. No cross-invocation
type or verdict cache is introduced.

Independent source cases cover terminating self/mutual calls, owned Unicode
results, unit and u64 results, actual JS plus independent strict TS, written
return spans, wrong/missing domains, borrowed escape, resource signatures,
forged meta and complete native reproduction. Handwritten native source is a
separate oracle reserved for gated CI. This draft proves neither general
termination nor native stack/resource parity.

Generic/method/async recursion, broader signatures and partial release, general
loops/mutation, source namespace/bootstrap, production adoption/parity and every
unfinished requirement remain open. No translator, preparer, installer or test
was run.
