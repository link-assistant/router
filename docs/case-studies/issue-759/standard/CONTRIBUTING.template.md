# JavaScript-first contribution workflow

Install the repository's pinned Node/Bun dependencies and begin with native JavaScript behavior tests. Implement behavior in the documented JavaScript subset, then regenerate covered outputs deterministically. Keep native implementations and unsupported features explicit in the parity inventory until shared fixtures and strict parity establish coverage.

Run the repository's complete JavaScript gate before committing a publication batch. Individual lint or test passes do not replace strict parity and both generation diff checks. A green gate must bind the current SHA and file contents. Configure all Rust CI jobs to depend on this gate; use broader Rust validation in CI and reserve local Rust for explicit targeted bounded exceptions.

Workers contribute isolated draft commits to one publication owner. That owner integrates the full batch, verifies it, publishes one tested head and waits for every CI job to finish. Leave running CI intact. Collect all failures and repair them together before repeating the complete gate and pushing again.

Keep the receiving repository's terminology, testing tier explanations, credential conditions, changelog fragment process, release steps and public API rules in this document. Add this workflow to those conventions rather than replacing them. Report unavailable parity or measurements honestly; there is no promise of complete generation until the strict gate proves its declared scope.
