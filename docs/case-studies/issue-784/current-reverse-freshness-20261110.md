# Reverse source freshness repair

[PR #785](https://github.com/link-assistant/router/pull/785) remains draft and
unfinished. The published `4ea091242` CI translator comparison reported three
stale outputs after changes to the actual application sources. Run the original
producer, `node scripts/regenerate-js-first.mjs --write`, to reproduce this
repair; no generated output was edited by hand.

The producer completed in 91.97 seconds and changed precisely the reverse input
capture, reverse draft manifest and enclosing JavaScript-first manifest. The
complete input capture retains all 144 files. Its two changed sources correspond
to the current JavaScript application and paired TypeScript application. Nine
additional declarations remain explicitly unsupported: the reverse draft has
701 source items, 701 unsupported items and zero translated items. Updated
byte counts and hashes reflect the complete actual output; freshness establishes
no additional executable coverage or parity.

The complete, unchanged `translator.test.mjs` passes all 12 original Node cases
through `scripts/run-node-tests.mjs`. Its independent source-derived deadline
audit passes with zero breaches. The repeated full-project case takes
252893.21 ms and has no declared Node case timeout; this result does not qualify
Bun's original five-second deadline. The complete Node command takes 263.62
seconds with a sampled cgroup peak of 2,266,034,176 bytes. The installed compiler
is lockfile TypeScript 5.9.3.

The first Bun launch fails before executing tests because Bun is absent from
the deliberately restricted PATH. A corrected absolute-path launch executes
nine cases successfully, then the container memory guard interrupts the
repeated full-project case after 82.76 seconds at 2,872,778,752 sampled cgroup
bytes. The observer reaps the subprocess; the command exits 143. The remaining
Bun cases and their deadline qualification are unfinished. Neither run changes
the original test, runtime limits or semantic bounds.

The [complete evidence packet](evidence/current-reverse-freshness.tar.gz) retains
all three whole outputs before and after regeneration, the actual producer and
original test, complete regeneration and engine logs, resource observations and
all six Node audit files. Its [receipt](evidence/current-reverse-freshness.json.gz)
records every member's complete size and SHA-256; all members were read back and
verified. The archive is 1,378,483 bytes, SHA-256
`487771afb2a4646a088167b99ff12f42a9e1dc6477bf056fe702315bd18c6047`.
The complete local gate, strict parity and same-head CI remain unqualified.
No Rust tool was run.
