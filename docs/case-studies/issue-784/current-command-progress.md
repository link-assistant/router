# Identify the interrupted gate command

The earlier complete gate at `ec90f0754` ended after printing the package native
TypeScript command. Later native-generation commands are silent until they
finish, so that output does not identify which child the memory guard stopped.
The original log cannot establish those silent completions. Its remaining
TypeScript work stays unqualified; parity and both translation stages are unrun.

A separate complete strict check of `js/test/native-types.ts` passes with the
installed TypeScript 5.9.3 in 3.423 seconds. Its diagnostic 256 MiB heap differs
from the original gate's 512 MiB child heap. Complete native regeneration with
that smaller heap fails after 15.023 seconds, with an explicit V8 allocation
failure and exit 134. Its requested CPU profile is not flushed. These are
separate diagnostics, not a reproduction or qualification of the old gate.

`ROUTER_JS_FIRST_COMMAND_PROGRESS=1` now prints scalar start/finish records for
each exact original mandatory command, with stage, status, signal, error and
elapsed time. Default behavior, all seven stage lists, child execution and fatal
failure handling remain unchanged. Observer failures propagate; they cannot
silently launch or qualify a child. No original deadline or heap bound changes.

The complete Node cohort includes both `check-js-first-local.test.mjs` and its
imported `check-profile-typescript.test.mjs`. All 15 observations and the
independent complete-source deadline audit pass in 16.235 seconds, with a
sampled cgroup peak of 2,756,845,568 bytes. Both complete Bun files pass their
13 registered cases in 12.005 seconds, sampled peak 2,597,261,312 bytes. The two
additional Node observations arise from explicitly selecting the imported file
as well; no case or assertion is filtered. The first Node attempt passed all
behavior but failed the independent audit because the imported file was not
preselected. Its complete failed result is retained separately.

These focused controls grant no complete-gate, generated-output, performance or
runtime-parity qualification. [PR #785](https://github.com/link-assistant/router/pull/785)
remains draft with its original application and acceptance failures unfinished.

The complete gate on clean source `b93129482ff79d06efca55b95f01c1b1fae78243`
now identifies the interrupted command: `node scripts/regenerate-native-typescript.mjs
--check`. Lint, all 259 native Node cases, all 259 native Bun cases, all nine
deadline controls and both package TypeScript checks finish successfully first.
The unchanged observer stops the owned process group after 359.540 seconds at
2,873,462,784 sampled cgroup bytes, above its 2,866,933,760-byte threshold.
The parent heap is 128 MiB and inherited child heaps are 512 MiB. Completed
fingerprint page advice finishes successfully; no active test clock is paused.
All owned processes are reaped. Regeneration, remaining TypeScript commands,
strict parity, forward translation and reverse regeneration remain unqualified
or unrun. No green stamp is issued. This new observation does not retroactively
identify the interrupted child in the earlier untraced gate.
