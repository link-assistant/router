# Refuse oversized Clone evidence before encoding

This investigation accompanies [PR #785](https://github.com/link-assistant/router/pull/785).
An actual 128-field Clone input exceeded the existing positive-output grammar
budget, but its complete evidence was serialized and recursively frozen before
the grammar rejected it. A finite regression counted that evidence encoding:
one before the change, zero afterward, with the same TypeError and budget text.
The complete failing and passing receipts remain retained.

The private materialized tree now receives an early traversal using the original
32000 logical-node and 64-level limits. It charges every occurrence, including
shared children. Accepted output still receives its complete evidence digest,
deep freeze, private issuer registration and independent full positive grammar.
No public source, namespace or executable authority is added. No field, variant,
proof, limit or accepted-output validation is removed.

The source producer authenticates the complete original archive, uses installed
TypeScript 5.9.3 to select the original validator and materialization statement,
and independently reconstructs both native span inverses. Its language and
repository phases serialize and reparse the complete CST and both inverses.
The captured proposal joins the current physical file before installation and
checks every installed afterimage byte. `--check` rejects stale current source.

The new complete two-case file passes under Node 20.20.2 and Bun 1.4.4 with the
original 60000 ms deadlines. Node also passes the independent deadline audit:
2421.40 and 2716.16 ms, 7.20 seconds for the observed command, peak sampled
cgroup 2129690624 bytes. Bun takes 2181.71 and 3186.44 ms, 6.45 seconds total,
peak 2125885440 bytes. Both commands finish without an observer stop.

The complete three-file Node cohort reports 23 TAP passes in 117.75 seconds,
but its independent audit correctly fails the existing complete historical
parent case: 78901.82 ms exceeds its unchanged 60000 ms deadline. The equivalent
complete Bun cohort is stopped by the resource observer after 38.66 seconds at
2868752384 sampled cgroup bytes; only three cases finish. These broader results
remain failed and incomplete. They do not qualify the full gate, generation,
strict parity, or the original CI failure. This change adds zero newly executable
production functions.

After verifying complete original bytes against already published evidence
archives and excluding active process paths, the task retires 53 closed raw
Node evidence directories: 318 files, 53003713 archived bytes verified and
53596160 allocated bytes removed. All originals remain in verified packets;
the complete retirement receipt and two earlier refusal receipts are retained.
