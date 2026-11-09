# Complete source-capture allocation scans

Published head `3b19785353c0a004efc62ab675a97b99c8a2e5a1`, run
42567703134, forward shard 2, failed the actual source-adoption workflow's
20,000 ms Python child deadline. Its complete job log records SIGTERM at lines
956–990; the unchanged enclosing case reported 21,994.468 ms. That failure is
still unresolved until the complete original receiving file passes.

Every source blob triggers fresh complete output and temporary-directory scans.
The scanner previously created a Python `Path` for each visited entry. It now
keeps string paths and uses `os.lstat`; it still stats each node afresh without
following links. No accounting total or verdict is reused. Every existing scan,
disk reserve, 30,000-entry bound, byte bound, source input and deadline remains.

The complete new Node and Bun regression file passes, including Node's
independent case deadline audit. Independent filesystem observations cover
changed, added and removed files, sparse logical size, external and dangling
symlinks, disappearing children, missing roots, special files and the original
entry limit. The same controls pass against the complete published predecessor.

A finite four-round alternating diagnostic scans all 529 nodes 24 times per
round and implementation. The second run took 272–309 ms per predecessor round
and 116–140 ms per candidate round. Complete before/after production source,
latest control source, all observations, both measurements, initial headroom
refusal, raw Node/Bun streams, deadline evidence and resource receipts are in
[the verified packet](evidence/current-allocation-paths.json.gz). The first
measurement predates the added disappearing-child control; the second includes
it. Neither diagnostic establishes the original workflow deadline, full gate,
runtime parity or any newly executable production function.

The original complete `core-adoption-receiving.test.mjs` subsequently finished
at source commit `21354e47e` under Node 20.20.2: seven cases passed, and the
actual workflow case still failed its unchanged 20-second producer child
deadline. The complete file took 39.56 seconds and sampled 2,833,354,752 cgroup
bytes without hitting the resource guard. This is a completed failed check,
not a qualified workflow speed gain. An opt-in finite Python call profiler in
`experiments/issue-784/python-profile` is available for investigating the
unmodified whole file; profiling overhead cannot establish its deadline.
