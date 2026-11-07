# Complete bea75c2c1 CI review

Published source `bea75c2c1676c78a381228a3a15557ae3a290276` started CI at
2026-11-07 21:18:50 UTC. The entire cycle finished at 22:19:19 UTC before the
next publication. [Run 42415256131](https://github.com/link-assistant/router/actions/runs/42415256131)
fails. Six supplemental callers skip; none supplies a passing JavaScript gate.
All seven complete logs and all three artifact ZIPs were downloaded. Every ZIP
member was read and checked for CRC, length and SHA256. The complete inspection
is 235855 decoded bytes, SHA256
`76b25d8a4b92d4f885a217e7fa0b012ad0872efa3bbdaafc1dde877d739aa494`.

| Required stage | Complete result |
| --- | --- |
| Node, Bun, lint | Pass. Both native engines run 259 cases. |
| Profile matrix | Fail on actual freshness differences at full workflow log line 12710. All three ordinary plans complete within the original 60-minute job limit. |
| TypeScript | Fail: genuine owned-definition matrix index is absent, lines 13920 and 13933. |
| Strict parity | Fail: stale `rust/src/account_routing_policy.rs` source hash, 441 feature gaps, 12345 carried items and runtime parity false, lines 14875–14880. |
| Forward | Cancelled at the original 60-minute limit, 22:19:11 UTC; complete partial TAP has eleven failure blocks. No terminal cohort audit exists. |
| Reverse | Cancelled at the original 15-minute limit, line 13414; no terminal cohort audit exists. |
| Aggregate / Rust | Aggregate fails at line 18884. Rust remains correctly skipped. No Rust tool ran locally. |

Each ordinary profile has 2803 missing, 67 stale and 742 unexpected outputs.
Together with the stale matrix index at line 12709, the failure lists contain
10837 reports. Neutral first missing/stale/unexpected reports are at lines
1873/2150/4743; Unix at 5485/5762/8355; Windows at 9097/9374/11967.
Old output prefixes still describe `src` while the actual corpus uses
`rust/src`. This requires genuine source regeneration. The check did not retain
its temporary output trees, so these counts cannot substitute for artifact
bytes or independently establish an executable gain.

All three plans bind 864 tracked sources, source-set SHA256
`9d5c9db827a58aa515cb2853da18380b3be4f1fd7c054d10c782b68d784ce1f4`.
Neutral/Unix/Windows report 160/161/161 executable functions and
12427/12400/12399 carried items. Project definition counts, generated methods
and standalone inventory counts remain separate; every profile records false
runtime parity, incomplete platform coverage and no common executable output.

Artifact 13593281603 retains the complete 6241-line partial forward TAP. Eight
failures in `actual-gain-families.test.mjs` retain the stale expected compiler
hash `84d99f5f6dbc5688e541c7fa697338151c955eea64c91e5a19d1e6bfd75c1ec2`
against actual `cd328961a7beb6504fe87f824edb1d54c08bc982d9e6a35711a9b9f2b1822dc2`:
TAP lines 553, 582, 611, 640, 669, 698, 727 and 756. The remaining failures are:

- Line 5443: complete core-adoption receiving workflow terminates with SIGTERM
  at its original 20-second child bound.
- Line 6095: complete literal-text corpus graph case takes 107920.885818 ms,
  exceeding its unchanged 60000 ms deadline.
- Line 6189: all-three-corpus native parse case takes 127007.485961 ms,
  exceeding its unchanged 60000 ms deadline.

The earlier seven registration failures are absent from this partial attempt;
that does not qualify an unfinished cohort. Expected negative deadline-control
failures in the passing lint job are preserved separately from genuine failed
stages. No PR-only skips, fabricated indexes, changed historical pins or raised
deadlines are used. No missing secret or human-only access prerequisite was
identified. The native-regeneration batch has its own
[complete local verification record](native-regeneration-batch.md); results at
different source heads do not qualify this published head.
