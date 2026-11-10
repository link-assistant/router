# Module-token and path-index history repair

The completed `e88183bb894b9ea62c9d6ae170c3fc099047685b` CI cycle exposed
six failures in the original facade and module-token history tests. The
receiving-history composer knew its first complete successor, but omitted the
later genuine path-index receiving update. Delivery continues in
[PR #785](https://github.com/link-assistant/router/pull/785).

The composer now joins both complete authored source transitions. It checks
the original source pin, complete retained history container and decoded bytes,
native TypeScript 5.9.3 statement/import selections, complete final source and
both serialized/reparsed CST phases and inverses. The earlier two selections
remain explicitly historical; three selections describe the composed update.
Unknown imports, weakened native/CST checks and changed phase names still
refuse. Source history grants no runtime or semantic authority.

The complete original two-file Node baseline reproduces six failures and four
passes. After the repair, all four files pass **22 cases under Node and 22 under
Bun**. The independent Node audit passes with zero duration breaches. Every
reported Bun duration also fits its corresponding unchanged 60-second Node
source deadline, including a 0.01 ms rounding allowance. All original test
files, source pins and case bodies are unchanged; two new cases check the
joined history and refusals.

Node 20.20.2 takes 267.24 seconds with 1,846,198,272 sampled cgroup bytes;
local Bun 1.4.4 takes 201.46 seconds with 2,350,784,512 bytes. CI uses Bun
1.4.3. Neither observation reaches the unchanged 2,866,933,760-byte guard.
Samples describe total cgroup usage rather than exact process peaks.

The [complete evidence archive](evidence/module-token-path-history-20261110.tar.gz)
is 178,589 bytes, SHA-256
`e581bc68697606b2802aa328c847dc6b58e8fd0b6c50a69ec970b933a016578d`.
Its [receipt](evidence/module-token-path-history-20261110.tar.receipt.json.gz)
records complete member hashes, source proposals, full native binding and
engine syntax checks, original test files, complete failed/passed streams and
both independent Node audit folders. The first author invocation used an
incorrect review SHA and failed before installation; its full stream is kept.

These focused results do not establish current-head CI, complete generation,
strict parity or a green JavaScript gate. Newly executable production functions
remain zero measured. No Rust tool was run.
