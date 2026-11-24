### Fixed

- Draft bounded exact decimal selection for async u64 literals, removing host BigInt conversion before the range check. Preserve native extrema and valid separators; independent native-AST, JS/TS and overflow source cases remain unrun during bulk drafting.
