### Changed

Add an explicit named-data declaration asset format and select it only for owned-core runtime source traversal. The legacy asset generator remains unchanged; complete selected source equality, independent checked-source fences and strict TypeScript equivalence remain required.

Reject unknown proposal input keys before collecting any descriptors, so rejected native lazy stack fields cannot invoke Error.prepareStackTrace.
