### Changed

- Draft a native-data freeze planner optimization that checks its call-local
  traversal records before the three bounded completed-object cohorts. Local
  records and preexisting completed records are disjoint throughout planning:
  completed records are inserted only after the full plan succeeds and each
  object freezes. Every unique-node, own-cell, incoming depth and alias charge,
  native qualifier, whole-input fallback and cache budget remains unchanged.
  The complete current planner source and its predecessor are retained for
  receiving checks. This draft is unrun and makes no performance or parity claim.
