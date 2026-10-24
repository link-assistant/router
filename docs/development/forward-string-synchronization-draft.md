# Forward-derived string synchronization source draft

A new proposal API drafts inverse synchronization for one actual string literal
edit in an already forward-qualified ordinary function. It accepts either the
complete current JavaScript or TypeScript output and recomputes the original
Rust project with the existing compiler. Native target parsing and complete
CST transport require exactly one changed source string literal.

The original compiler's `checkedSource()` association supplies the actual
qualified function, body literal value and original source span. Candidate
selection reuses that checked value instead of decoding Rust strings again.
Each checked function body and each relevant file token stream is traversed once
per invocation. A missing or ambiguous original literal refuses; a spelling,
source hash, metadata field or supplied compiler callback cannot qualify it.

The proposal edits that original Rust token using the existing Rust string
encoder, then independently recompiles the complete proposed project. Its whole
output must reproduce the requested target literal change while preserving the
entire executable/refusal/method census. Syntax or code outside that literal
cannot change. The canonical JS/TS pair is returned with the full Rust proposal,
captured original Rust inputs, both ordered rule sequences and complete source
inverses for all three languages. The old checked program is released before
the second compilation; no source/owner/verdict/result cache survives a call.

This approach reuses the forward compiler's grammar for inverse edits; it does
not require a second independent reverse implementation of every admitted body.
Its initial edit scope is deliberately limited: multiple edits, ambiguous string
origins, methods/constants, newly unqualified code and other JS/TS constructs
still need further inverse rules. The proposal contains DATA only. The receiving
source transaction must freshly recompute it and check current paired files,
Cargo/profile/compiler inputs and conflicts before any installation. This API
does not install files or qualify another repository.

The encoder module is a complete source copy of the original target emitter,
with its original implementation intact and an additive export. Both substitution
phases, complete source originals and inverses are retained. Independent actual
JS/TS edits, strict paired runtime behavior, Unicode/control escapes, ambiguity,
source conflicts, accessor/forgery and source-history cases are drafted and unrun.
No proposal, compiler, target, preparer, test, experiment, Rust tool or CI has run.
Receiving transaction/CLI integration, broader inverse edits, full production
translation and all other open requirement ledger rows remain unfinished.
