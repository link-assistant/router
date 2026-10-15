# JavaScript-first development and one publication gate

Implement and test behavior in JavaScript first. The canonical subset and all native, partial or missing implementations must be explicit in the parity inventory. Run the repository's complete checked-in gate: lint, Node and Bun native tests, types, strict parity, forward translation diffs and reverse regeneration diffs. Generation must fail for unsupported constructs rather than carrying them silently. No Rust compilation is permitted before every stage passes for the current SHA and file contents.

Use isolated worktrees and draft commits only within your assigned worktree. One designated owner integrates, pushes and creates or updates the pull request. Collect the entire completed CI failure set and repair it in one coordinated batch before the next push. Do not cancel the existing CI run, publish speculative fixes, or bypass the complete JavaScript gate.

Do not run a full local Cargo build/test/Clippy suite. An explicitly necessary targeted exception needs a current green gate stamp and a bounded wrapper with a single locked shared target outside all worktrees. Limit jobs, aggregate RSS, CPU, wall time and target disk; disable debug and incremental compilation; enforce a free-space reserve. Under scarce disk, stop local builds and stream compressed evidence under the configured task budget. Remove only your own temporary artifacts, never existing user caches or a running lock.

Preserve repository terminology, testing tiers, credential requirements, public contract compatibility, changelog and release conventions. Report incomplete parity or unavailable measurements explicitly. Do not treat inventory consistency as semantic equivalence.

## Shared rule and synchronization contract

Keep two ordered rule sequences: `language` first, then `repository`. The first
establishes source semantics and private evidence; the second preserves them while
adapting paths, imports, formatting and quality conventions. Both Rust → meta →
JavaScript/TypeScript and JavaScript → meta → Rust/TypeScript serialize, reparse and
independently check semantic meta before emission. Retain unsupported domains and
source spans; rule traces and public metadata grant no admission authority.

Declare each family's source of truth and generated ownership. Automate real forward,
reverse and TypeScript producers in dependency order; check mode must reject stale
outputs without repairing them. Preserve original inputs and all explicit refusals.
Do not manually repair generated output or confuse freshness with runtime parity.

Run complete focused JavaScript files under Node and Bun plus strict TypeScript
execution, collect the whole related failure set, then regenerate and run the full
same-SHA JavaScript gate. Add meaningful Rust edge SOURCE cases, but never claim
unexecuted Rust behavior passes. An explicit stricter user policy supersedes the
bounded local Rust exception above: when local Rust is forbidden, run no tests,
builds, Clippy, rust-script or other Rust-backed tools. Rust CI stays behind every
same-SHA JavaScript requirement, even for an authorized incomplete feedback draft.

Run one heavy compiler, test or compression workload at a time. Measure actual
workloads before optimization; keep original semantics, deadlines and complete cases.
Preserve full failed/pass streams, source versions, commands, compiler identities and
resource receipts losslessly within fixed storage budgets. Reuse worktrees and
dependencies, check disk and do not remove another worker's active artifacts or lock.
Follow explicit cleanup authorization and record actual reclaimed bytes.

Default to at most three active workers; adjust only for explicit user or environment
constraints and lower the limit when resources require. Keep source ownership and
the single heavy-workload lease explicit. Only the publication owner pushes or updates
pull requests. Retain complete metadata and raw logs for every finished CI job/attempt;
no second push or cancellation while the current batch is active. An edit invalidates
a green stamp. Report draft coverage and all remaining parity gaps candidly.
