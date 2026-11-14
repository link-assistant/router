# Complete gate after the companion registration repair

The complete local gate on clean source `b7f8826b1` remains unsuccessful.
The parent uses 128 MiB old space and inherited children use 384 MiB; the
container limit and 2,866,933,760-byte observer threshold are unchanged. No
original stage command, test file, assertion, timeout or strictness is removed.

The first invocation refuses to launch because the initial cgroup observation
is 3,001,049,088 bytes. Advice on this task's closed Git objects lowers that
observation to 2,671,550,464 bytes. The next complete invocation stops during
the initial fingerprint after 15.531 seconds, at 2,876,342,272 sampled bytes.
It completes only 31,232 of 49,493 fingerprint inputs; no stage has run.

After advice on the task's complete closed tracked files, the observation falls
from 2,696,646,656 to 2,543,042,560 bytes. The final invocation completes the
entire initial fingerprint and lint stage, including all workflow controls.
It then stops during `npm run native:test --prefix js` after 230.025 seconds,
at 2,868,043,776 sampled cgroup bytes. Its completed TAP prefix does not qualify
the whole native suite. Bun, TypeScript, parity, forward translation and reverse
regeneration are unrun. Every owned process and page adviser is reaped.

The page advice concerns closed task-owned files only: no file content is
changed, no active test clock is paused and no global or foreign cache is
altered. The different starting conditions and heaps prevent treating these
observations as a measured performance comparison. The earlier complete gate
that reached native regeneration remains separately recorded in
[the command-progress report](current-command-progress.md).

The [complete packet](https://github.com/link-assistant/router/blob/79f375ed1d9690ab8336e06a28331c2871092eb0/docs/case-studies/issue-784/evidence/current-companion-gate.json.gz?raw=true) retains both
interrupted invocations, the initial refusal, complete traces, memory receipts,
page-advice records and executed sources. Its full readback and member hashes
are verified by [the retainer](../../../experiments/issue-784/retain-companion-gate.py).
No green stamp, runtime parity, Rust execution or newly executable production
function is established. [PR #785](https://github.com/link-assistant/router/pull/785)
remains draft with the complete-gate and original acceptance requirements open.
