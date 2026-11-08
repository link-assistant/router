# Preserve the complete RefUpdate compilation parent

The original string-equality regression pinned the entire historical
`git_proxy.rs` source while reading its current path. The actual current module
has adopted owned-core types, so that whole-file comparison fails before the
unchanged `RefUpdate` methods can be checked. This failure appears in the
[completed CI inventory](current-completed-ci-10fd.md) for
[PR #785](https://github.com/link-assistant/router/pull/785).

The receiving test now retains the complete 18,664-byte historical parent from
Git blob `6ec3aef45141780fe879519e1e8778504a23b810`. Its original whole-source,
declaration, method and span hashes remain asserted. The current complete
19,232-byte parent is pinned separately: its entire struct and implementation
must equal the original declarations, and its constant must equal the actual
primitive producer's output, including complete source inverse verification.
Compilation still uses the complete original declarations and retains every
original empty-refusal, semantic, runtime, strict-TypeScript and negative case.

A first diagnostic tried to compile the current declarations with a partial
core graph. The original empty-refusal assertion correctly failed; the full
source and failure remain retained. The final complete file passes all three
cases under Node 20.20.2 (9.551 seconds TAP; 10.016 seconds observed wrapper) and
Bun 1.4.4 (7.00 seconds reported; 7.132 seconds wrapper). The Node audit records
no source-declared finite deadlines in this file and no inferred deadlines.
All owned children closed; neither final run reached the aggregate memory guard.
Peak sampled cgroup use was 2,011,181,056 bytes for Node and 2,052,468,736 for Bun.
These are sampled total-container observations, not exact process peaks.

The [complete evidence packet](evidence/current-string-equality-parent.json.gz)
retains all 28 source, fixture, failed/pass stream, resource and audit members.
The original first-draft Node behavior failure remains distinct from its passing
duration audit. This receiving repair adds zero executable production functions,
grants no real-crate admission and does not qualify strict parity, the full gate,
CI's Bun 1.4.3 or Rust execution.
