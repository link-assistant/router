# Separate canonical serialized metadata receiver

[PR #785](https://github.com/link-assistant/router/pull/785) adds a separately
generated receiver for canonical serialized CST chunks. The original private
reader remains byte-for-byte pinned and its public source/document APIs remain
unchanged. The receiving helper selects this separate domain only for bounded
canonical chunks; a large individual document keeps the original single reader.

The qualified native JSON parser creates both private parsed objects. Every
canonical wire byte must equal a complete fresh original CST build, including
all fields, nodes, trivia, diagnostics, coordinates and authority flags. A second
independent fresh build and complete leaf reconstruction remain mandatory for
every row. Original source, serialized, node, chunk and aggregate bounds, input
descriptor snapshots, native function checks, authenticated source joins and
cleanup remain in force. There is no result cache or new semantic authority.

The producer selects complete native TypeScript 5.9.3 syntax nodes from the
original private reader, preserves the two named rule phases and verifies both
complete serialized/reparsed source inverses. Generation and subsequent actual
freshness checks pass. Generated files remain below 1000 lines.

All **eight complete adversarial receiving cases pass in Node and Bun**. Node's
independent original-deadline audit also passes. Whole-process elapsed times are
14.756 seconds and 12.177 seconds respectively. The separate complete six-case
helper file passes in Bun in 5.057 seconds. Node is 20.20.2, Bun 1.4.4 and the
installed TypeScript compiler is 5.9.3; CI's pinned Bun version remains separate.

The downstream complete two-file Node attempt passes all **12 assertions**, but
its independent deadline audit **fails**: source-lifetime history takes
188477.043 ms against its original 60000 ms limit. Total elapsed time is
203.609 seconds, with sampled cgroup memory reaching 2413981696 bytes. The
earlier instrumented history result is not a controlled speed comparison.

The same complete two-file Bun attempt is **unqualified**. Its six helper cases
pass, but lifetime history fails after 113108.04 ms: a genuine fresh Node child
hits its original 50000 ms timeout. The unchanged memory guard stops the owned
process tree at 2873307136 bytes, after 117.457 seconds. Remaining file execution
is incomplete. No timeout, source workload or memory threshold was increased.
The later separate whole helper pass does not qualify that interrupted attempt.

The [complete observation receipt](evidence/current-canonical-meta-reader.json.gz)
preserves all passed and failed closed logs, complete Node audits, original
source snapshots, generated source equations and resource receipts. New
executable production functions are **0**. Downstream deadline repair, genuine
current generation, strict parity, the complete gate, same-SHA CI and remaining
universal client privacy requirements remain unfinished.
