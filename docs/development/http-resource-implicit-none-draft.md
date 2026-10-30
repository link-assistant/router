# Original implicit None continuation draft

All implementation and regression source is drafted and unrun. No tests,
experiments, diagnostics, translation, preparation, regeneration, Rust tools,
push or CI ran. Every unfinished [ledger requirement](bulk-draft-requirements.md)
remains open. This source draft is not measured executable coverage.

The original binding reader now retains actual if-let branches with no else.
A separate complete syntax selector requires the success branch to end in an
actual function return and the enclosing block to finish with precisely None,
either as its tail or its final return statement. A grouped None tail retains
its entire original group span. Other fallthrough, fallback calls, extra effects
and different absence values refuse.

The native normalizer composes the selected original branch with existing checked
Option propagation and lexical scopes. It removes only the actual final None
continuation, retains exact source spans and constructor namespace checks, and
preserves original return targets inside loops or nested scopes. A successful
branch may compute a different Some payload through the preceding constructor
rules. The fresh complete JS/meta/native check still validates all effects,
ownership, cleanup and return domains. Missing alternatives do not grant those
permissions.

The separate generic unchanged-payload selector recognizes only the complete
pure Some/None identity form and preserves its precise Option<T> header. Whole
original source/CST inverses remain required. Four complete compiler equations
retain native owners and both ordered phases. Independent source covers actual
absence and payload changes, alpha-renamed bindings, grouped absence, opaque
generic payloads, drop timing, loop-local return targets and malformed or wider
fallbacks. Resource oracle module 39 is drafted. None of these cases has run.

Whole returning-loop reconstruction is drafted in the separate
[terminal loop successor](http-resource-returning-loops-draft.md); it remains
unrun, and loop-local normalization alone is not a whole-function receiving claim.
General fallthrough and branch joins, architecture/producer closure,
broader effects/types, production adoption/parity, receiving, original source/
timing/profile and reverse freshness repairs and every CI gate remain unfinished.
