# Literal source privacy history

[PR #785](https://github.com/link-assistant/router/pull/785) remains unfinished.
The published head's [translation shard 7](https://github.com/link-assistant/router/actions/runs/42518964289/job/128848041800)
fails at retained log lines 1739–1753: the historical literal-input comparison
expects the complete old native relay, while the physical relay includes this
issue's privacy changes.

A receiving-only helper uses the existing whole-file pinned privacy rules to
restore exactly the reviewed historical source. It verifies the complete current
hash, ordered reverse edits, complete historical hash, independent forward
replay, and serialized and reparsed Rust source phases and inverses. It retains
both complete sources. Historical and unrelated sources remain unchanged;
altered, truncated and duplicated current sources refuse. Callback errors retain
their identity. This gives no semantic or runtime authority and changes no
production privacy behavior or expected historical hash.

The original nine literal-input cases and original two privacy-composition cases
retain every assertion and deadline. One finite 10-second refusal/history case
is added. Both complete files run together:

| Twelve cases | Seconds | Peak sampled cgroup bytes | Result |
| --- | ---: | ---: | --- |
| Node 20.20.2 | 17.821 | 2,403,577,856 | Twelve pass; independent deadlines pass |
| Bun 1.4.4 | 19.251 | 2,683,408,384 | Twelve pass |

Neither observation reaches the guard. The [whole receiving packet](evidence/current-literal-privacy-history.json.gz)
retains both complete published before and current tests, the full helper and
pinned rules, command streams, receipts and Node audit. All 22 members pass full
readback. Installed TypeScript is 5.9.3; CI uses Bun 1.4.3 and remains separately
unqualified. Newly executable production functions: zero. The full gate, strict
parity and universal tool/account privacy criteria remain unfinished. This is
no immutable launch snapshot. No Rust tool ran.
