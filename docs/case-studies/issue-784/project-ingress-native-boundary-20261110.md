# Refuse changed native operations before graph discovery

The complete Core producer receiving file exposes a shared graph-ordering
regression: `captureSourceModuleViews` serializes discovery data before the
original private-parser native guard runs. A changed `JSON.stringify` therefore
receives source data before the expected refusal. This affects both the original
and copied Core paths; their agreement alone did not catch the regression.

The graph reader now calls the existing fresh native guard after each physical
read and primitive-string check, before retaining the source or discovering its
children. Reader errors still propagate first. No guard verdict survives a call,
and the later complete CST serialization/reparse and semantic checks remain.
The two-edit pinned repository layer composes with both complete source-history
readers. The actual existing project producer installs the result; no generated
project source is edited by hand.

The complete producer proposal retains **8,362,437 decoded bytes** and passes
the installed TypeScript **5.9.3** native scope check, both ordered CST phases,
complete source inverses and readback. Its decoded SHA-256 is
`2a4bb8197ded99e1735db4fc21b4095999a2ddc8b96863c8239aa39482439fe2`.
The new project source SHA-256 is
`7aaa41e1795936c630eadcfc64ccd4c882e713c389b0408f85a63b66edd530fe`.

Three regression cases preserve independent expected refusal/error results:
an already installed JSON hook, a reader that installs the hook, and reader-error
identity followed by fresh changed-source admission. Before the fix, both Node
and Bun fail the first two and pass the third. Afterward all three pass in both
engines, including a complete independent Node deadline audit. The original
60000 ms case limits and all original test bodies remain unchanged.

The larger nine-file, 46-case receiving cohort remains **failed**. Node reports
40 assertion passes before the unchanged container guard stops the Core file;
its deadline reporter cannot complete, and the missing audit remains explicit.
Bun completes 45 passing cases within their original deadlines; the Core file's
sixth case remains unobserved after its memory-guard stop. A complete focused
Node retry containing the new file and Core file also hits that guard. Releasing
cached pages of verified inactive task evidence reduces file-cache accounting
by only 4,141,056 bytes and does not resolve the memory failure. No memory cap,
guard threshold, case deadline or child timeout is raised.

A separate complete Node run of the seven other graph/history files passes
all **37 cases** and its independent deadline audit. Thus 40 current Node cases
are independently audited; the Core file remains unqualified. The Core source's
unchanged deadline joins come from the preceding failed audit only for comparing
current Bun durations. Its old outcomes never qualify the new implementation.
The source-only census has 33 finite registration call sites, including a wrapper
and dynamic names; it does not infer that call count equals runtime case count.

An uninstalled finite guard-cost diagnostic compares 1,536 fresh calls to each
of three common-guard variants in six rotated rounds. Median per-call times are
58.46 microseconds for the current numeric guard, 162.83 for descriptor collection
and 81.88 for the proposed kind discriminator. All 32 bounded descriptor/hook
mutation controls agree and invoke zero callbacks. Neither alternative is
installed. These local diagnostic timings establish no receiving performance
qualification or application coverage.

Complete before/after, rejected author selectors, original sources, full producer
proposal, every receiving log/resource receipt, completed and missing audit
evidence and diagnostic measurements are retained in the verified
[evidence archive](https://github.com/link-assistant/router/blob/79f375ed1d9690ab8336e06a28331c2871092eb0/docs/case-studies/issue-784/evidence/project-ingress-native-boundary-20261110.tar.gz?raw=true)
and its [receipt](evidence/project-ingress-native-boundary-20261110.tar.receipt.json.gz).
The case study and source fix do not establish complete compiler registration,
canonical/matrix freshness, strict parity or a green JavaScript gate. Those
requirements and the original whole-Core memory failure remain unfinished.
No Rust tool ran. The change adds **zero executable production functions**.
[PR #785](https://github.com/link-assistant/router/pull/785) stays draft and unmerged.
