# Local gate after the matrix diagnostic change

The complete local gate was attempted at clean commit
`2d62cc2877273f9235d1bf5373bc648cfd1d3e29`, with Node 20.20.2,
Bun 1.4.4 and the lockfile-installed TypeScript 5.9.3. It failed; no green stamp
or Rust authorization was produced. [PR #785](https://github.com/link-assistant/router/pull/785)
remains draft and unmerged.

The first attempt stopped during input fingerprinting, before any stage, after
6.35 seconds. Its observed peak was 2,867,326,976 bytes. A bounded adviser then
processed only the actual completed 10,752-input prefix. It preserved source
bytes and did not touch global caches, Git objects or another process's files.

The second attempt used the existing completed-fingerprint page adviser. It
fingerprinted all 50,021 inputs and kept every original command and deadline.
The gate parent used 128 MiB old-space and descendants inherited the selected
192 MiB limit. Neither test clocks nor the cgroup guard were paused or raised.

| Stage | Actual result at this SHA |
| --- | --- |
| Lint and orchestration | Passed all mandatory commands, including 39 workflow cases and the original fixture suites. |
| Native Node | 259/259 passed. |
| Native Bun | 259/259 passed. |
| TypeScript controls and packages | Nine deadline controls and both package typechecks passed. |
| Native TypeScript regeneration | Failed with heap exhaustion and exit 134 at the selected 192 MiB heap; later commands in this stage were unrun. |
| Parity acceptance | 121/121 passed. |
| Strict parity | Failed: stale `account_routing_policy.rs` inventory hash, 441 draft gaps among 443 features, 12,345 carried items, `runtimeParity=false`. |
| Forward Node tests | Runner returned failure before producing its case audit; `case-deadlines.json` was absent and both raw test streams were empty. This is not a passing cohort. |
| Remaining forward, matrix and reverse checks | Unrun after the resource interruption; no generation or receiving qualification is established. |

The second process tree was stopped and fully reaped after 559.74 seconds when
sampled cgroup use reached 2,873,110,528 bytes, above the unchanged
2,866,933,760-byte guard and below the 3,135,369,216-byte container cap.
The final forward command has no recorded finish event. Its failure message
preceded the stop, and its audit is incomplete. There is no basis to assign
passes or source-declared deadline compliance to any unobserved case.

The [complete packet](https://github.com/link-assistant/router/blob/9b6c9192c70f1f9309eac0c516b59102ce080409/docs/case-studies/issue-784/evidence/current-matrix-live-gate.tar.xz?raw=true) contains all
86 original gate, adviser and deadline files from these attempts. Every member
was read back and matched by length and SHA-256 before its inactive raw
duplicate was retired. The packet is 3,321,568 bytes; SHA-256 is
`56f707cc166b1025ad8f0cab945c229aafc73f39bc32938e79a4d495a459e1c4`.
The [retention receipt](evidence/current-matrix-live-gate-retention.json.gz)
also preserves the independent CI-receipt container transcode: all 42,785,918
decoded JSON bytes remain identical, SHA-256
`6a8446771903de23eb692e58db274d36213bb589d0fd40ed93fa90dfcd6cc975`.
That inspection retained complete original JSON but discarded original ZIPs
and source/raw-log copies; it does not claim custody of those discarded bytes.

Evidence again exceeded its cap during the gate: the measured original total
was 509,856,194 bytes. The first retention run refused its unnecessarily tight
490 MB post-retirement assertion after fully writing and verifying its packet;
no original was removed then. A separate finish pass reverified every member,
the complete transcode and all inactive original identities before retiring
26,726,474 bytes. Its resulting evidence total was 495,627,667 bytes. These
temporary overruns remain failures of the resource policy, not compliant runs.

An older 12,521,064-byte temporary PR review diff was subsequently retired to
make room for current failure logs. Its exact decoded bytes were verified
against the earlier receipt before deletion. That temporary diff is no longer
retained; the old readback receipt is historical. Published commit history is
preserved, and no CI log was removed. This cleanup does not claim byte-exact
reconstruction from a different Git diff command.
