# Full local gate at ef601cec, 2026-11-09

[PR #785](https://github.com/link-assistant/router/pull/785) remains draft.
The actual complete local JavaScript gate was launched from clean commit
`ef601cecf4766f9ab3527ea0ab898744ef37a24c` with Node 20.20.2, Bun 1.4.4,
installed TypeScript 5.9.3, a 128 MiB parent heap and 512 MiB child heaps.
The [complete 33-member observation](evidence/current-ef601-gate.json.gz)
retains full command output, original deadline audit files, resource receipts,
source inputs and the executed harnesses, with complete member readback.

| Stage | Actual result |
| --- | --- |
| Lint and workflow checks | All ten original commands pass. |
| Native Node | All 259 cases pass, 41.391 seconds. |
| Native Bun | All 259 cases pass, 76.553 seconds. |
| TypeScript | Ten deadline controls, both package type checks, native regeneration freshness and strict native compilation pass. All nine native TypeScript assertions pass, but the independent audit fails its original drift case: 125,468.140 ms against 60,000 ms. Later TypeScript commands are unrun. |
| Acceptance | All 121 original cases pass, 1,685.034 seconds. |
| Strict parity | Fails after 603.744 seconds. Its forward-check child exhausts its finite 512 MiB heap; the inventory still has 441 draft gaps, one validation error and 12,431 carried items. |
| Forward translation | All 697 selected whole source files, 11,324,176 bytes, are prepared by the independent auditor. The memory guard interrupts execution before any completed case is reported. Final case-audit output is absent; later forward commands are unrun. |
| Reverse translation | The stage is unrun. |

After 3,242.428 seconds, the unchanged resource observer samples 2,870,001,664
cgroup bytes against its 2,866,933,760-byte stop threshold. It stops only the
owned process group; every recorded owned process is reaped. The interrupted
runner records its absent final case-deadline receipt as an error. This is a
memory interruption, not a passing forward test or successful whole gate.

Completed-prefix file-cache advice occurs only after the actual fingerprint
records; it changes neither source bytes nor running test clocks. No deadline,
test file or resource guard is relaxed. The final fingerprint is not reached,
no green stamp is produced and no Rust tool is invoked. This attempt establishes
no newly executable production functions. An uninstalled Clone enclosing-format
proposal remains separate and behaviorally unqualified.
