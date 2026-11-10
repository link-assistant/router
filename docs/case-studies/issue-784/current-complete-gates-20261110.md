# Complete local gate attempts after reverse regeneration

[PR #785](https://github.com/link-assistant/router/pull/785) remains incomplete.
Both attempts execute the original complete `scripts/check-js-first-local.mjs`;
neither produces a green stamp or authorizes Rust. The original case deadlines,
strictness, test files and seven stage lists are unchanged.

The first attempt at `456f62dd1e425e37d83603b5e8a6060ac960fdc6` has an
incorrect restricted PATH: it omits the installed npm directory. All ten lint
commands pass. Both native runtime commands and public type checking fail before
execution with `/bin/sh: 1: npm: not found` (exit 127). The ten deadline-auditor
controls pass; parity acceptance begins and reports 104 completed assertions.
The task explicitly terminates this invalid local invocation after 488.657 s;
the observer reaps every owned descendant. Its sampled container peak is
2679508992 bytes. No CI run is cancelled.

The corrected attempt at `bcf84c063f06754ba48aa7d2c4c23e48bfdbd5ce` includes
the installed npm directory after Node 20.20.2 in PATH and uses a 768 MiB child
heap and 512 MiB gate-parent heap. Its complete command results are:

| Original workload | Result |
| --- | --- |
| All ten lint commands | Pass |
| Whole native Node suite | 259 pass, zero failures; 41.137 s TAP total |
| Whole native Bun suite | 259 pass, zero failures; 73.88 s |
| Whole deadline-auditor controls | 10 pass; independent audit `complete-mmeH2l` passes |
| Public and native declaration checks | Both pass under installed TypeScript 5.9.3 |
| Native TypeScript regeneration check | Pass; 11586409 output bytes, zero changed or unexpected artifacts |
| Strict complete native TypeScript compilation | Pass; 167 files, TypeScript 5.9.3 |
| Whole original native TypeScript test file | Nine assertions complete; independent deadline audit fails |
| Complete parity acceptance | Interrupted after 104 completed assertions; no terminal suite result |
| Later checks | Nine later TypeScript commands, strict parity, all forward checks and all reverse checks are unrun |

The original regeneration drift case at `native-typescript.test.mjs:230` takes
78857.500265 ms against its unchanged 60000 ms deadline. Audit `complete-6InVJ5`
records nine completed cases and exactly one duration breach. The file takes
281.960 s in TAP, and the audited command exits 1. The compiled-runtime case
separately passes: all 259 shared expectations execute against both JavaScript
and compiled TypeScript in Node, and the compiled suite also passes Bun.
Those behavioral results do not waive the failed regeneration deadline.

During parity acceptance the unchanged memory observer samples 2867023872 bytes,
crossing its 2866933760-byte threshold within the 3135369216-byte container limit.
It stops and reaps only the owned invocation after 874.003 s (exit 143).
Completed-fingerprint page advice does not pause test clocks or alter checks.
No unchanged memory-failing workload is repeated.

The [whole packet](evidence/current-complete-gates-20261110.tar.gz) contains
170 original members, including both full command logs, resource receipts,
all 23 complete audit directories and their intentional negative controls,
original test/runner sources and the full fingerprint-advice records. Its size
is 1679892 bytes, SHA-256
`05ee501b5b8b71e227b0902f0c3814b2448666e6f1dccc31f2b88881351ebaed`.
The [receipt](evidence/current-complete-gates-20261110.json.gz) records every
whole member hash, exact source head, command result and cleanup observation.
All members are fully read back before retiring 5785865 logical / 6074368
allocated bytes of inactive duplicate audit files. The packet also preserves
the independently verified retirement of 33 older published CI duplicates,
reclaiming 1059335 logical / 1155072 allocated bytes. Task evidence remains below
the unchanged 500 MB limit. No Rust tool runs locally.
