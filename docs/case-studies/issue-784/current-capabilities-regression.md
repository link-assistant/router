# Preserve both capabilities source revisions

Published forward job 128901874967 fails at whole-log line 3885 because the
original capabilities test expects source SHA256 `7a8bb8a7…` while the physical
repository source is now `f51ba943…`. The former complete 10,801-byte source is
retained verbatim from commit `62c47c18a52ce9af2768690a92d0ed3655bc6c8b`, with
provenance and license notice. The original test keeps its complete assertions,
original function hashes/spans and 60-second deadline against that fixture.

A second complete case checks the current 11,259-byte physical source and its
actual independently parsed function span/hash. Both cases retain whole-parent
translation, source drafting, strict TypeScript and JavaScript execution,
malformed/proxy-input refusal and explicit false runtime-parity observations.
The initial Option/Result payload test remains unchanged.

Neither complete-file attempt qualifies this pair yet. Node 20.20.2 reached
the unchanged resource guard after 23.149 seconds at 2,872,000,512 sampled
cgroup bytes. Bun 1.4.4 passed the initial payload case, then reached the same
guard after 17.532 seconds at 2,868,228,096 bytes. Every owned child was reaped.
The Node audit is incomplete; no deadline pass or capabilities execution pass
is claimed. Lockfile TypeScript 5.9.3 was selected, and original strictness and
deadlines remain unchanged.

The [complete evidence packet](evidence/current-capabilities-regression.json.gz)
retains the original/current whole tests, both whole source files, notice,
complete attempt streams, resource receipts and available partial audit bytes.
Every decoded member passed length/SHA256 readback. This is a source repair
awaiting whole-file receiving qualification; no application gain, full-gate or
strict-parity success is established, and Rust was not run.
