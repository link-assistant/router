### Changed

- Add a bounded first-difference diagnostic only after the existing private standard frame body comparison refuses. It inspects the two already-hashed alpha snapshots and retains the original predicates, hash arguments and evaluation order; it grants no source or emission authority.

### Validation

- Source-only: complete before/after and inverses retained. Runtime receiving and Rust are unrun; original cases, workloads and deadlines remain unchanged.
