# Integrated gate at ec90f0754

The mandatory `node scripts/check-js-first-local.mjs` ran against committed
source `ec90f0754fb04b411f7194b7e731be7fec52ec86`. Node 20.20.2 used a
128 MiB parent heap and 512 MiB inherited child heaps, with Bun 1.4.4 and the
lockfile-installed TypeScript 5.9.3. No local Rust tool ran.

The complete fingerprint covered 49,319 paths / 1,844,431,820 bytes. A separate
completed-prefix page adviser finished successfully: it advised only closed,
single-link, task-owned regular worktree files after actual fingerprint
progress. It changed no source, guard or test clock, removed no file and
performed no global cache operation. This is a separate observation from the
previous incomplete fingerprint with asynchronous large-file advice.

| Stage | Result for this attempt |
| --- | --- |
| Lint | Passed, including the complete workflow and coordinator files. |
| Native Node | All 259 cases passed; complete report duration 35.225 seconds. |
| Native Bun | All 259 cases passed; complete report duration 67.12 seconds. |
| TypeScript | Nine deadline controls and ordinary package TypeScript passed. The stage was interrupted after printing the native package TypeScript command. The log lacks per-command progress, so the exact interrupted command and any subsequent silent completions are unestablished. The remaining stage is unqualified. |
| Strict parity | Unrun. |
| Forward translation | Unrun. |
| Reverse translation | Unrun. |

The observer stopped the owned process group after 348.453 seconds, with exit
143 and a sampled cgroup peak of 2,867,609,600 bytes. The unchanged stop
threshold was 2,866,933,760 bytes; the container limit was 3,135,369,216 bytes.
These are total cgroup samples, not a child RSS or complete process peak.
Every owned process and the separate adviser finished before retention.

The [complete packet](evidence/current-layered-integrated-gate.json.gz) retains
the full gate output, resource receipt, complete adviser output/receipt, exact
gate and observer sources, and all six deadline-evidence files. Every member
was read back and checked for complete length and SHA256. No green gate stamp
was issued. This attempt qualifies neither current generation nor parity,
newly executable production functions, Rust CI or release readiness.

[PR #785](https://github.com/link-assistant/router/pull/785) remains draft while
these checks and the issue-wide acceptance criteria remain unfinished.

The earlier wording attributed the interruption to the last printed package
command. A later separate strict check passes that complete file in 3.423
seconds with TypeScript 5.9.3 and a 256 MiB heap. This diagnostic cannot prove
what completed in the earlier gate. The separate complete native-regeneration
check exhausts that heap after 15.023 seconds; its CPU profile is not flushed
on the fatal exit. Neither observation qualifies the interrupted gate.
