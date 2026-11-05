# Original linear generic forwarding closure

The direct unchanged-input theorem now covers actual linear local aliases and
calls to other complete, already checked generic unchanged-value helpers. The
source checker follows original declaration order, moves each live slot once and
requires every generic local to enter the single unchanged returned value. It
admits no other statements, manufactured values, implicit drops, mutation,
captures, unknown callees or recursive generic cycles. Written local/wrapper/call
types must name the same actual lexical slot; their original tokens and complete
inverse remain retained when generating JS. Ordinary generic bodies stay open.

Every helper dependency is a genuine current local function checked earlier by
the original complete call graph. The Rust source proposal independently closes
its actual whole generic function graph, with its own move/drop census and a
bounded acyclic dependency walk. Completed results exist only inside that one
native projection invocation. No source, owner, verdict or result cache crosses
an invocation. Native function calls and aliases remain in the emitted body;
none are replaced with a guessed identity expression or preserved comment.

The existing flow emitter now renders the checked generic aliases/calls too.
The full JS proposal is rechecked through serialized/reparsed meta and must
reproduce every original canonical Rust token. Concrete calls and callbacks
continue to use their actual domains, ownership, cleanup and complete borrow
roots. Paired source-unit proposals retain the same fresh complete-body checks.

The final [meta-language frontend](https://github.com/link-foundation/meta-language/blob/75b3412a4903073d52d8bcd7b898b0023b22d198/js/src/translation/rust.js)
and [formal-ai frontend](https://github.com/link-assistant/formal-ai/blob/fb32030d7fb7b7b0964b53a255738d70a617576c/scripts/self-translation/frontends.mjs)
were reviewed read-only. Both still refuse general type-parameter functions at
those revisions; neither supplies a general implementation to import here. This
closed forwarding theorem extends Router's original source implementation and
preserves its pinned source controls. No upstream pin or license was changed.

Six full originals and ordered language/repository substitutions retain complete
CST/source inverses. The superseded alias refusal remains archived and becomes
an actual moved-value control, with independent positive source for aliases and
forwarding. JS, strict TS, full native inverse, dependency order, forged-meta,
move/drop/cycle refusals and an independent Rust drop-counter oracle are drafted
and unrun. No compiler diagnostics, test, experiment, preparer, translator,
generation, local Rust tool or CI ran. General generic operations/constraints,
methods/classes/interfaces, namespace/bootstrap, production parity and every
unfinished bulk requirement remain open.
