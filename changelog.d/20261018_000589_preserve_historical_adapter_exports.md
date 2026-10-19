### Fixed

- Preserve the complete historical JSON guard in pre-import helper comparisons
  while forwarding the current path and completed-freeze compatibility exports.
- Give relocated historical frozen-JSON fixtures the native stringify composer
  expected by current proof consumers, recording the bridge in their complete
  reversible source maps. Original fixtures, assertions and case limits remain
  unchanged. Full receiving verification and generated freshness stay separate.
