# Terminal returning loop draft

All implementation and regression source is drafted and unrun. No tests,
experiments, diagnostics, translation, preparation, regeneration, Rust tools,
push or CI ran. Every unfinished [ledger requirement](bulk-draft-requirements.md)
remains open. No receiving, measured coverage or parity result is claimed.

The complete resource flow now drafts an actual final `for (;;)` whose checked
body has function returns and no loop exit or scope fallthrough. It retains the
body's complete return summaries, original resource exits and propagated errors.
The final return domain and all immutable input roots pass through the existing
whole-function joins. Mixed domains, break, continue, fallthrough and a body with
no function return do not acquire a terminal result from public metadata.

Native loop source supplies only a proposal. The projector retains an actual
final loop as the complete native tail, then the fresh JS/meta checker must
establish the terminal exit shape. Emission retains the checked loop with its
actual returns and adds no fabricated fallback. All complete native token and
original source/CST inverse checks remain required. Finite while loops and wider
generic or divergent-only return domains keep their original refusals.

This composes the preceding loop-local no-else Option normalization with a whole
function rather than stopping at syntax. Three complete compiler equations retain
native owners and both ordered phases. Independent unrun source covers Boolean
branch behavior, a literal return, precise Option transformation/absence,
immutable returned input roots, mixed-domain and loop-exit refusals, forged meta,
changed inputs and original native reconstruction. Existing native source oracle
forms remain required in gated CI; no Rust execution occurred locally.

Architecture/producer closure, wider language/effects, production adoption/parity,
complete receiving, original source/timing/profile and reverse freshness repairs
and every CI gate remain unfinished.
