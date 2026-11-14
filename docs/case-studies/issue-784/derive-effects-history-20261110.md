# Derive effect history comparison

[PR #785](https://github.com/link-assistant/router/pull/785) remains draft.
CI job 129670695120 compares the current derive-footprint source with a pinned
historical interface. The previously installed path-index repair adds 232 bytes;
the comparison omitted its complete inverse and reports `55672 !== 55440`.

The complete original ten-case Node file reproduces that single failure.
The repair composes the existing pinned path-index producer before the earlier
source history. Its serialized and reparsed language/repository CST equation,
complete inverse and fresh native binding checks remain explicit. Historical
source hashes, all eight initial native actions and original deadlines stay intact.

All ten cases now pass under Node 20.20.2 and Bun 1.4.4. Independent Node
deadline auditing passes; Bun's complete case observations also stay within
their original limits. Author review uses lockfile TypeScript 5.9.3.

The separate seven-case retention file still has two failures: its generated
native CLI predates the progress-adapter change, and a CLI subprocess exceeds
its existing 20-second limit. These remain unfinished. The combined Node run
passes 15 of 17 cases, with no case-deadline or container guard breach.

The [complete evidence packet](evidence/derive-effects-history-20261110.tar.gz)
and [member receipt](evidence/derive-effects-history-20261110.tar.receipt.json.gz)
retain the failing baseline, complete author equations, both receiving streams,
the related failures, resource observations and complete independent audits.
This repair adds no executable production functions, does not establish parity
and does not establish a passing complete JavaScript gate. No Rust tool ran.
