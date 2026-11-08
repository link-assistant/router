# Current Unicode host declaration history

The published `17c7dd9942814f2a6a17eee135016e5941f04f15` forward CI fails the
first named host declaration regression because its historical reader receives
the current Unicode declaration source. The old reader correctly refuses that
different complete source; removing its checksum would weaken the regression.

The separate `prepareCoreUnicodeHostAssetHistory` producer authenticates the
complete original eight-file archive and derives the existing whole host-source
equation. It transports both named CST phases, reparses complete source, checks
two native copies and preserves the exact inverse. Its scope is declaration
history DATA, with no Unicode property, runtime or semantic qualification. The
ordinary eight-file Unicode producer and the old history reader stay unchanged.

The receiving adapter composes this equation with the unchanged historical
reader. The original declaration suite retains every case, assertion and
60000-ms limit. Two added controls check full CST restoration and refusal of
changed current source. They also verify that the old reader still refuses
current Unicode bytes.

Both complete files pass under Node 20.20.2 and Bun 1.4.4: ten cases per engine.
The audited Node run completes in 179.355926 seconds, with zero independent
duration breaches and a sampled total cgroup peak of 2343571456 bytes. Its
longest case takes 52470.531687 ms. Bun completes in 160.237524 seconds, with
a sampled total cgroup peak of 2812354560 bytes; its longest case takes
51471.55 ms. Neither attempt reaches the memory stop threshold. The preliminary
direct Node run also passes but does not supply the independent audit.

Complete original logs, resource receipts, source files and the closed Node
deadline audit are retained in `evidence/current-host-unicode-history-receiving.json.gz`.
CI's Bun 1.4.3 remains a separate receiving observation. This repair adds no
executable production function and establishes neither full parity nor a green
complete JavaScript gate. Rust remains unrun.
