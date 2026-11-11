# Complete local gate at b366d594d

[PR #785](https://github.com/link-assistant/router/pull/785) remains unfinished.
The complete local JavaScript gate was invoked on clean source commit
`b366d594d8b84bdb7143c516e1863e29c9656e20`. It **fails**, and no green stamp
is produced. The original whole files, command list, strictness and deadlines
are unchanged. No local Rust tool is invoked.

The command is `node --max-old-space-size=128 scripts/check-js-first-local.mjs`
with Node 20.20.2 and `NODE_OPTIONS=--max-old-space-size=512` for its children.
The installed TypeScript compiler is 5.9.3; local Bun is 1.4.4. CI's pinned
Bun 1.4.3 is a separate qualification. Default-off scalar command/fingerprint
diagnostics are enabled. Completed fingerprint pages receive cache advice;
active test clocks are never paused.

| Required stage | Actual observation |
| --- | --- |
| Lint | All ten commands pass, including workflow structure and complete coordinator controls. |
| Native Node | All 260 cases pass. |
| Native Bun | All 260 cases pass. The earlier three persistence failures do not recur in this attempt. |
| TypeScript | Deadline-auditor controls 10/10, declaration checks, native freshness and strict compilation of 167 native files pass. The complete nine-case native TypeScript file passes its assertions but fails the independent deadline audit. Nine later commands are unrun after that failure. |
| Parity | All 121 acceptance cases pass in 1049278.276112ms. The subsequent actual strict checker fails. Passing acceptance cases do not qualify the strict result. |
| Forward translation | The original complete, unfiltered Node cohort starts. The aggregate memory guard stops it; its incomplete reporter produces no case-deadline receipt. The four subsequent generation/freshness commands are unrun. |
| Reverse translation | Every command is unrun because the aggregate memory stop terminates the owned gate. |

The failed TypeScript case is
`native-typescript.test.mjs:230`, “regeneration rejects stale, missing, and
unexpected TS, meta, and asset artifacts.” Its observed duration is
**76899.145829ms**, exceeding its unchanged 60000 ms source deadline. The whole
file completes in 260637 ms; all nine passing assertions remain insufficient to
qualify it. The compiled runtime case independently passes all 260 shared
expectations under both Node and Bun.

The actual strict checker runs for 459934.109437ms. Its complete canonical
`translate-router.mjs --check` comparison aborts at the explicit 512 MiB heap cap
after 356928ms, before the unchanged 1200000 ms command bound. The checker also
reports 443 native features, 62/62 operation entries, 368/368 route entries,
**441 draft gaps**, one validation error and **12426 carried Rust items** over
865 source files. Entry counts are not complete behavior or runtime parity.

The aggregate observer stops at 2867855360 sampled cgroup bytes, above the
unchanged 2866933760-byte guard and below the 3135369216-byte container limit.
Total elapsed time is 2301.264452 seconds. The six owned gate/forward process
IDs are signalled and reaped. The forward wrapper retains its terminal record,
whole raw streams and complete source request even though its case receipt is
missing. This is an incomplete failed cohort, not a passing audit.

The [whole packet receipt](evidence/current-source-origin-full-gate.json.gz)
and [complete published archive](https://github.com/link-assistant/router/blob/124edb33e096a2c018caf449214005ad555d8bdd/docs/case-studies/issue-784/evidence/current-source-origin-full-gate.tar.gz?raw=true)
identify 118 complete archive members, including all 13 audit directories,
every stage diagnostic, the resource receipt, complete fingerprint-page
receipt and refreshed issue/PR/run metadata. Every archived member is reopened
and checksum-verified. Only the archived inactive audit leaves are then retired,
reclaiming 15103726 logical and 15257600 allocated bytes. Negative deadline
fixtures inside the passing auditor controls are intentional controls; they do
not represent additional production-suite failures.

The packet also retains the bounded unit-profile ancestry analysis and the
separate seven-directory task DATA retirement receipt. No active build or
another task's files are removed. The [native source-census diagnostic](evidence/current-b366-native-source-census.json.gz)
finds 344 modules, 343 original files, 2339 edges and 4704748 raw bytes: 510444 bytes
over the unchanged 4194304-byte private compiler limit. It produces no compiler
plan, semantic proof or executable authority.

The complete published f93 CI cycle is independently recorded in
[the terminal review](ci-f93-terminal-20261111.md). Neither that failed cycle,
these local results nor the separately passing receiving files establish a
same-SHA green gate. Current generation, every original deadline, strict parity,
the raw source bound and universal tool/account privacy remain mandatory and
unfinished. New executable production functions from the source DATA changes: 0.
