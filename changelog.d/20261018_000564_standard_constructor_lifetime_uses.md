Keep canonical Option and Result constructor lifetime checks tied to the
current checked expected type. Their shared monomorphic runtime layout no
longer supplies a previous use's static lifetime to a later borrowed value.
Nominal static fields, static call arguments and returns, and each tuple
field's existing fallback still require their original borrow origins.

Add mixed-order, nested-payload, original Option filter, private-frame tamper,
and incomplete tuple-metadata regressions. Full parent reader receiving and
both engines remain unrun in the authoring worktree; no coverage or resource
gain is claimed.
