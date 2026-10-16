# JavaScript-first contribution workflow

Install the repository's pinned Node/Bun dependencies and begin with native JavaScript behavior tests. Implement behavior in the documented JavaScript subset, then regenerate covered outputs deterministically. Keep native implementations and unsupported features explicit in the parity inventory until shared fixtures and strict parity establish coverage.

Run the repository's complete JavaScript gate before committing a publication batch. Individual lint or test passes do not replace strict parity and both generation diff checks. A green gate must bind the current SHA and file contents. Configure all Rust CI jobs to depend on this gate; use broader Rust validation in CI and reserve local Rust for explicit targeted bounded exceptions.

Workers contribute isolated draft commits to one publication owner. That owner integrates the full batch, verifies it, publishes one tested head and waits for every CI job to finish. Leave running CI intact. Collect all failures and repair them together before repeating the complete gate and pushing again.

Keep the receiving repository's terminology, testing tier explanations, credential conditions, changelog fragment process, release steps and public API rules in this document. Add this workflow to those conventions rather than replacing them. Report unavailable parity or measurements honestly; there is no promise of complete generation until the strict gate proves its declared scope.

## Translation rules and synchronization

Declare two ordered rule sequences: `language` first, then `repository`. Language
rules establish syntax, ownership, types, coercions, effects and evaluation order.
Repository rules choose paths, imports, formatting and quality conventions while
preserving that checked meaning. Keep stable rule identities, explicit prerequisites,
source spans, supported domains and refusals. Extend shared rules for whole construct
families; do not substitute familiar names, public flags or handwritten per-function
replacements for source evidence.

Both Rust → meta → JavaScript/TypeScript and JavaScript → meta → Rust/TypeScript
must serialize, reparse and independently check semantic meta before target emission.
Repository formatting rules cannot bypass this boundary or grant semantic authority.

Use a concrete syntax tree (CST) extension to meta-language in both actual source
paths. Retain complete source, comments, whitespace, punctuation, delimiter groups
and source spans through canonical serialization and reparsing. Consume the
reconstructed source in the independent parser, checker and checked semantic meta
boundary before target emission. Keep lexical fidelity separate from grammar,
type, ownership and executable admission. Preserve unsupported and malformed source
without silently dropping text, and refuse forged concrete classifications or
public flags as semantic evidence. Check exact UTF16 code units and honest UTF8
mapping, explicitly reporting replacement encoding for unpaired surrogates.

Declare the source of truth and generated ownership for each supported family; keep
unsupported native implementations visible. Automate the actual producers in dependency
order. Write mode regenerates owned artifacts, check mode reports stale artifacts
without repairing them, and both preserve original inputs. Never patch generated
outputs to conceal a source-rule defect. Freshness and carried source are separate
from executable behavior and full runtime parity.

Inspect existing upstream implementations and tests before adding translator
machinery. Pin reviewed commits and retain complete source, notices and licenses;
keep candidate copies inactive until receiving qualification passes. For an upstream
or tooling defect, retain exact versions, a minimal reproduction, full failed output
and any workaround. The publication owner reports it within the user's authorization.

## Verification and Rust policy

Begin with complete focused JavaScript test files under Node and Bun and execute
strict-compiled TypeScript. Use original source bodies and independent positive,
negative and boundary results. Add meaningful Rust edge regression source for the
same behavior, including empty values, Unicode, overflow, malformed inputs, ordering
and errors when relevant. Do not report an unexecuted Rust test as passing.

After collecting related failures, integrate the repair batch, regenerate every
affected output and run the complete same-SHA JavaScript gate and freshness checks.
An edit invalidates an earlier stamp. Every Rust-capable CI job must remain blocked
until all required JavaScript stages pass for that exact source SHA and contents.
Focused checks, inventory consistency and source preservation cannot unlock Rust.

An explicit stricter user policy overrides any local Rust exception in this template.
If the user prohibits local Rust, do not run tests, builds, Clippy, rust-script or
other Rust-backed tools, even targeted ones; add source cases and obtain execution
results from gated CI. Otherwise only an explicitly necessary bounded targeted
exception may follow the complete current gate. Preserve all existing test tiers,
credential requirements and public contracts.

## Resources and coordinated delivery

Run one heavy compiler, test or compression workload at a time. Reuse existing
worktrees and dependencies, check disk space, and set finite wall, CPU, memory and
storage budgets before launch. Measure actual cold workloads and retain profiles
before optimizing; preserve semantics, deadlines and cases. Do not hide a timeout
by filtering tests or raising its limit. Retain complete failed and passed streams,
source versions, compiler identities, commands and resource receipts with lossless
compression under the task's fixed allocation. A digest alone is not a retained body.
Do not remove another worker's active artifacts or lock; follow explicit cleanup
authorization and record actual reclaimed bytes.

Use at most three active workers by default, with isolated owned changes and a single
publication owner. Change that default only to follow explicit user or environment
constraints, and lower it when resources require. Agree on source ownership and the
single heavy-workload lease before execution. The owner collects complete CI metadata
and logs for every job and attempt after the whole batch finishes; no repeated pushes
or cancellation while CI is active. Preserve draft status and honest missing coverage.
An explicitly authorized incomplete feedback draft cannot claim a green gate or
permit Rust before its same-SHA JavaScript prerequisites pass.

Track each requested requirement through its source changes, generated artifacts,
checks and remaining gaps. Continue source review and independent drafting in
assigned worktrees while remote CI runs, preserving the published head and the
single-workload policy. Wait for complete CI results before integrating the next
repair batch. Distinguish drafted work and unexecuted checks from verified behavior.
