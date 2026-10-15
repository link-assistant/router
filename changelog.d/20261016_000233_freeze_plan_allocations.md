### Changed

- Draft a bounded native-only allocation reduction in completed-data freezing:
  validate already-enumerated own keys with individually qualified descriptors,
  and avoid pending frames for scalar children already classified by that same
  validation pass. Complete scalar cost accounting, shared-path heights, unique
  node/own-cell/depth/cache bounds and whole-input fallback remain unchanged.
  The exact original recursive freezer and every source, JSON, cryptographic and
  private output reissue check remain unchanged.
- Extend the existing whole callback oracle with a singular-descriptor observer;
  keep all eight cases and original limits. The measured prior planner hotspot
  motivates this source-only candidate, which is UNRUN and claims no speed gain.
