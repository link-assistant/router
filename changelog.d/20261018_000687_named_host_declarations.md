### Changed

Add an explicit named-data declaration asset format and select it only for owned-core runtime source traversal. The legacy asset generator remains unchanged; complete selected source equality, independent checked-source fences and strict TypeScript equivalence remain required.

Reject unknown proposal input keys before collecting any descriptors, so rejected native lazy stack fields cannot invoke Error.prepareStackTrace.

Derive the strict consumer census from complete actual declaration AST exports instead of guessed contract counts. Test JSON mutation as an explicit checker-guard refusal, and exercise live Math-only reentrancy separately after restoring all hooks before error inspection.
