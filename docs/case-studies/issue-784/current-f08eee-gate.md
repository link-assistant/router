# Complete local gate on f08eee092

The unchanged complete local gate was attempted on clean source
`f08eee0927b9f3b7c2081bf6d3d4fcf975adf644`. It stopped during lint and did
not pass. The [complete verified packet](evidence/current-f08eee-gate.json.gz)
contains all 18 selected original files, full streams, command events, source
harnesses and resource/page-advice receipts. Every member was decoded and its
length and SHA-256 independently rechecked after writing.

The command used Node 20.20.2, Bun 1.4.4 on PATH, a 128 MiB parent heap and
192 MiB child heaps. It ran `node scripts/check-js-first-local.mjs`, retaining
the complete original command list and deadlines. The lockfile compiler remains
TypeScript 5.9.3. The smaller heap is a resource experiment; it establishes no
performance improvement over the earlier 384 MiB attempt.

All 49,845 fingerprint inputs completed. Five mandatory lint commands passed:

- Complete Rust asset synchronization freshness.
- Complete reverse Bun file coordinator freshness.
- Complete reverse Bun shard coordinator freshness.
- `node scripts/lint-js-first.mjs`.
- All three complete coordinator/input test files selected by the original gate
  command, with `--test-concurrency=1` as already declared by that command.

The sixth mandatory command, the complete workflow test file, started but did
not finish before the existing observer stopped the owned process group. Its
TAP header does not qualify any case. The whole lint stage is therefore
incomplete. Native Node, native Bun, TypeScript, strict parity, forward
translation and reverse regeneration stages are unrun for this attempt.

The observer sampled total container memory every 0.1 seconds. It recorded
2,867,679,232 bytes at the unchanged 2,866,933,760-byte stop threshold, within
the 3,135,369,216-byte container limit. The process returned 143 after
201.309 seconds. This is sampled total cgroup use, including other processes,
rather than attributable child RSS or a guaranteed peak. The original gate
owner, every stopped descendant and the completed page-adviser process were
confirmed absent before retention. The adviser returned zero and did not pause
an active test clock. Only identified inactive task inputs received page advice;
no foreign process, source or build cache was removed.

No green gate stamp was produced, no local Rust tool ran, and no newly
executable production function is established by this observation. The draft
[PR #785](https://github.com/link-assistant/router/pull/785) remains incomplete.
