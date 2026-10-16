Extend complete deep-freeze regressions with a custom lookup that replaces an
operation during traversal and a lazy-stack formatter that replaces and restores
a hook before reentering the freezer. Retain full original/current graphs and
callback tapes under each engine's actual formatter behavior. The existing
freezing algorithm, source ownership, fresh proof/hash checks, storage budgets
and case deadlines remain unchanged. Rust verification stays in CI after the
complete JavaScript gate.
