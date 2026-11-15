# Complete local gate on 7582887

The required `node scripts/check-js-first-local.mjs` attempt ran on clean source
`7582887d33b36e2284688d971fa983c2e4226330` using Node 20.20.2, Bun 1.4.4 and the
lockfile-installed TypeScript 5.9.3. The parent used a 128 MiB heap and children
retained their 384 MiB setting. The unchanged cgroup guard remained
2,866,933,760 bytes under the container's 3,135,369,216-byte limit.

The full 49,679-file fingerprint, complete lint stage, all 259 native Node tests
and all 259 native Bun tests pass. The original nine-case Node deadline controls
and both strict package type checks pass. The command progress trace contains
15 completed successful commands, followed by the start of
`node scripts/regenerate-native-typescript.mjs --check`.

The resource observer stops that regeneration after 368.216 seconds of total
gate time at 2,868,002,816 sampled cgroup bytes. Every owned process is reaped.
This is an interrupted TypeScript stage, not a complete TypeScript pass or a
semantic regeneration failure. Remaining TypeScript commands, parity, forward
translation and reverse regeneration are unrun. No green stamp is written and
no local Rust tool executes.

The [complete verified packet](evidence/current-7582887-gate.json.gz) preserves
21 members, including whole raw output, resource and closed-page receipts,
original command boundaries, all six independent deadline-audit files and
executed observer/gate sources. All bytes, member lengths and SHA-256 hashes
are verified after reopening the packet. Owned closed file pages were advised
without changing content, deleting caches, pausing an active test clock or
touching another process. No limit or original deadline was raised.

This result establishes zero newly executable production functions and does
not qualify full parity or release readiness. CI at the earlier published head
has its separate [complete terminal-cycle report](current-3b197-ci-review.md).
[PR #785](https://github.com/link-assistant/router/pull/785) remains draft.
