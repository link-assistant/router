# Complete native namespace copying

In [PR #785](https://github.com/link-assistant/router/pull/785), the explicitly
requested immutable-target route now constructs its complete native Maps
directly, avoiding the discarded outer and per-scope `.map()` result arrays.
Every parser still has independent mutable outer and inner Maps, every scope
and binding remains present, and privately frozen target vectors retain their
existing sharing contract. The full native-operation qualification, visibility
checks and original observable fallback remain in place.

The predecessor is the actual complete `source-scopes.mjs` from
`8552c8e17737161111b54ee1d8f6b1afa43b054d`, stored with full raw, gzip and Git
blob identities in the new test fixture. A separate TypeScript 5.9.3 native
syntax review selects the one added `if (share)` statement and proves the
complete inverse. Both declared language/repository phases and the full CST
serialization/reparsing retain the original before, middle and after sources.
This source equation grants no semantic or executable authority.

The complete original `immutable-source-namespace-paths.test.mjs` and
`source-scope-templates.test.mjs` pass all 15 cases on Node 20.20.2 and Bun
1.4.4. Node's complete independent deadline audit passes. The observer records
14.375 seconds/2320228352 sampled cgroup bytes for Node and
9.116 seconds/2312286208 bytes for Bun. These are whole-container samples,
including the agent and file cache, rather than process RSS or exact peaks.

The new complete two-case file passes on both engines. It compares every
namespace map against the actual predecessor, verifies mutation isolation and
frozen-target identity, and compares complete callback tapes with patched
`Map.prototype.set`, `Array.prototype.map` and `Object.fromEntries` after warm
immutable setup. The original hostile-hook tests remain unchanged. The first
new Node attempt failed because its test compared function identities across
separate physical module copies; its whole source and failed stream remain
preserved. The corrected comparison uses complete function text and the actual
predecessor. Node takes 1.208 seconds, Bun 1.411 seconds, with both original
30000 ms case bounds unchanged and a passing Node deadline audit.

One finite 65-module ABBA experiment performs 96 configurations per leg,
compares every namespace for four consumers and checks all native-map and
target identities. The two original legs total 444.816 ms, the two changed
legs 347.225 ms. This narrow allocation measurement is not a full-project
speed guarantee or a repaired CI deadline. Native syntax checks also pass
in both engines without evaluating the proposed modules or resolving imports.

The [complete evidence packet](evidence/namespace-cloning.tar.xz) and its
[readback receipt](evidence/namespace-cloning.receipt.json) retain the full
positive/negative streams, source fixtures, CST/native equation, experiments,
original Node audit payloads and resource receipts. The packet also preserves
the separate terminal-CI duplicate-retirement receipt: 211 inactive task files,
8198494 logical bytes and 8433664 allocated bytes, each fully preserved in the
verified terminal packet before removal.

This change adds zero executable production functions. Full retained-map
memory, every remaining original CI deadline, canonical/profile freshness,
441 strict parity gaps and one validation failure, the complete local gate
and universal client/account privacy remain unfinished. No Rust ran locally.
