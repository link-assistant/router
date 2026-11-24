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
Broader inverse edits, full production translation and all other open
requirement ledger rows remain unfinished.

The source-unit transaction and CLI are now drafted. A manifest selects the
complete physical Rust entry, authoritative JS or TS file, paired file and
review output:

```json
{"schema":"router-forward-string-unit-v1","id":"message","entry":"rust/src/lib.rs","authority":"JavaScript","javascript":"js/src/message.mjs","typescript":"ts/src/message.mts","meta":"translation/message.json"}
```

`planForwardStringUnitSynchronization` captures the complete Rust universe,
actual Cargo/workspace inputs, manifest, both targets and Git revision. A
differing independent paired edit refuses. Missing paired output can be
initialized. The proposal retains every original, proposed output and inverse.
`applyForwardStringUnitSynchronization` recomputes everything and uses the
original guarded installer with atomic replacement, readback and rollback.
Saved plans never supply source or semantic authority.

After the whole bulk draft phase, the intended CLI commands are:

```sh
node scripts/sync-router-forward-strings.mjs --manifest unit.json --plan new-plan.json
node scripts/sync-router-forward-strings.mjs --manifest unit.json --apply new-plan.json
```

The CLI preserves fresh-process dependency binding, existing memory/time/byte
limits and exclusive plan creation. It has no runtime-only bypass. Independent
JS/TS transaction, missing paired file, stale source/revision, concurrent edit,
forgery, linked source, argument and complete source-history cases are drafted
and unrun. No transaction, CLI, installer, compiler or test has executed.

The additive bulk API `proposeBulkForwardStringSynchronization` now drafts up to
4,096 distinct string edits, including edits across Rust modules. It parses the
whole requested JS/TS source and compares every gap outside literal tokens. It
traverses each actual checked body once for all requested values, tokenizes each
relevant Rust file once, applies nonoverlapping native spans, then recompiles the
entire proposed project once. The original checked program is released first.
The complete target must reproduce all edits with the same full census. This
reduces repeated source checking within a batch without persistent caches.

Every changed native file has its own complete CST equation and inverse. The
bulk transaction uses schema `router-forward-string-bulk-unit-v1` with the same
manifest fields above. `scripts/sync-router-bulk-forward-strings.mjs` has the
same explicit plan/apply arguments and original guarded installation. Complete
single-edit APIs remain available in their original modules.

Repeated original values, ambiguous source origins, changed nonliteral code,
added/removed tokens, methods/constants and broader expressions still refuse.
The batch is all-or-nothing: an unresolved edit cannot silently disappear.
Independent multi-edit JS/TS behavior, cross-module source capture, ambiguity,
conflicting code and atomic transaction/forgery source is drafted and unrun.
The bulk compiler, planner, CLI and every test remain unexecuted.
