# Original Option if-let propagation source draft

All implementation, target/refusal and native oracle source in this batch is
unrun. No test, experiment, diagnostic, translator, regeneration, Rust tool,
push or CI ran. Every unfinished [ledger requirement](bulk-draft-requirements.md)
remains open; no new executable coverage measurement is available.

The complete original native reader retains actual `if let Some(binding)`
keyword, constructor, delimiter, payload, initializer, branch and fallback spans.
The lexical source normalizer accepts only an immutable ordinary payload and an
exact otherwise-empty `else { return None; }`. It checks original constructor
shadowing, resolves the initializer in the previous scope, and creates a fresh
branch-local binding without exposing it after the conditional.

Ordered source rules normalize that branch to a lexical block containing the
existing checked Option propagation form and original successful body. Earlier
returns and loop targets remain in their actual function/callback. A genuine
`else if let` becomes the containing else block without overlapping wrapper
edits. An input is never extracted eagerly before an earlier Boolean branch.
Complete normalized functions still reenter the original JS/meta checker and
must reproduce their native output; syntax substitution grants no type, borrow,
move, ownership, return or executable permission. Full original trivia and removed
fallbacks remain recoverable through the complete CST/source inverse.

Three complete original source equations retain both rule phases and native
owner bounds. Independent unrun cases cover nested propagation, earlier branch
laziness, signed/unsigned/text/generic payloads, original binding shadowing,
branch scope, literal traps, loop return targets, wrong types and extra fallback
effects. Rust oracle source checks the original branches, integer/Unicode values
and actual moved payload drop timing; it joins the existing gated discovery as
the 37th resource oracle module. Native compilation remains CI-only after all
same-SHA JavaScript stages pass. Wider patterns/matches, ordinary no-else if-let,
architecture/producer closure, production parity and all other requirements stay
unfinished. A source inverse is not an executed reverse translation.
