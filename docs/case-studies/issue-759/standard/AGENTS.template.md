# JavaScript-first development and one publication gate

Implement and test behavior in JavaScript first. The canonical subset and all native, partial or missing implementations must be explicit in the parity inventory. Run the repository's complete checked-in gate: lint, Node and Bun native tests, types, strict parity, forward translation diffs and reverse regeneration diffs. Generation must fail for unsupported constructs rather than carrying them silently. No Rust compilation is permitted before every stage passes for the current SHA and file contents.

Use isolated worktrees and draft commits only within your assigned worktree. One designated owner integrates, pushes and creates or updates the pull request. Collect the entire completed CI failure set and repair it in one coordinated batch before the next push. Do not cancel the existing CI run, publish speculative fixes, or bypass the complete JavaScript gate.

Do not run a full local Cargo build/test/Clippy suite. An explicitly necessary targeted exception needs a current green gate stamp and a bounded wrapper with a single locked shared target outside all worktrees. Limit jobs, aggregate RSS, CPU, wall time and target disk; disable debug and incremental compilation; enforce a free-space reserve. Under scarce disk, stop local builds and stream compressed evidence under the configured task budget. Remove only your own temporary artifacts, never existing user caches or a running lock.

Preserve repository terminology, testing tiers, credential requirements, public contract compatibility, changelog and release conventions. Report incomplete parity or unavailable measurements explicitly. Do not treat inventory consistency as semantic equivalence.
