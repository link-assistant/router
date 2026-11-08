# Terminal CI at published 764222b6

[PR #785](https://github.com/link-assistant/router/pull/785) remains a draft.
All seven workflows for `764222b6e6d4f0ce1efb0341396cfb6a87661e85`
have completed. The [main run](https://github.com/link-assistant/router/actions/runs/42529550250)
has 59 terminal jobs: 10 passed, 17 failed, seven were cancelled and 25 skipped.
The six supplemental workflows skipped. This task did not cancel any run.
The tested merge `a6989a7e76cb009ab2c7460e646faad025297190` has exactly the
published tree `fcbc786945dc23af8f1b809080d0ccca66f44a2f`.

The [container manifest](evidence/ci-764222b6/manifest.json) identifies 179
whole originals, 40,224,672 bytes moved without copying. All 24 published
artifact ZIPs are retained: 34,171,218 bytes, 431 fully read members.
The whole-run ZIP has 249 fully read members. The retainer verifies every
container and member's full length and SHA256, plus ZIP CRCs, before and after
the move. The plan's first tree lookup failed before any move; the corrected
retainer uses the Git database response's top-level tree. This is evidence
integrity, not semantic qualification.

All 24 nonpassing job responses are retained, but only 23 complete job logs
exist. Cancelled forward translation shard 7 (`128880489169`) returned
`BlobNotFound`. The exact-job CLI retry returned `log not found`; the whole-run
ZIP has no forward shard-7 member. Its reverse shard-7 members are a different
job. The whole-run CLI command also failed because it required too many API
requests; the independent whole-run API ZIP succeeded. These original errors
are retained. Complete job-log collection remains explicitly unsuccessful.

Each line reference below is in the complete corresponding
`current-764-job-JOB_ID.log.gz`. The retained final failure index also includes
the original deadline-audit results and all available diagnostic lines.

| Failing job | Observed failure |
| --- | --- |
| Lint `128880488960` | Lines 448–477: workflow custody no longer matches its complete source equation. The separate local repair derives the setting through the full equation; Node controls pass, Bun has an original implicit-deadline failure. |
| Parity `128880489028` | Lines 891–894: stale native `account_routing_policy` evidence; 441 gaps (151 partial, 290 unsupported), 847 sources and 12,345 carried functions. |
| TypeScript `128880489755` | Line 454: missing `profiles/owned-definitions-matrix-80dc0d37762835fbe925b47e6fad25fee5c1d3c093fafff0512fc2bd3f9ae4e0.json`. |
| Forward freshness `128880489004` | Lines 490–542: stale or missing real Rust, meta, JavaScript, TypeScript and inventory outputs. |
| Reverse freshness `128880489233` | Line 297: current forward inventory differs from the captured definition. |
| Translation 1 `128880489093` | Original literal-text and schemars cases exceed unchanged 60-second deadlines (61,540.254 and 101,515.576 ms). |
| Translation 3 `128880489043` | Line 1777: named ASCII producer rejects complete current physical source. Line 1902: strict TypeScript record-field alias. Lines 2664, 3179, 3239: complete proof subprocess timeouts. |
| Translation 4 `128880489110` | Line 1163: whole three-repository strict checks exceed 60 seconds. Line 1762: combined dispatch lacks base64 namespace, mutable scalar and original `vec!` expansion support. Lines 3128 and 5279: complete proof subprocess timeouts; line 3433: generated-source reconstruction/load failure. |
| Translation 5 `128880489087` | Line 1830: named Unicode producer rejects complete current source. Lines 2031 and 2585: whole-parent/proof timeouts. Line 2851: strict TypeScript record-field alias; the enclosing nine-parent case also took 1,898,454.258 ms against 60 seconds. Lines 2977 and 4283: historical whole-owner source identities differ. Line 3388: original external-trait refusal differs from the successful current adapter. Line 4325: original candidate import replacement assertion fails. |
| Translation 6 `128880489049` | Lines 1074–1157: actual CSV owners lack executable declarations or expected refusal; one complete case took 1,368,912.496 ms against 900 seconds. Additional actual event, tuple, recursive token, JSON and in-band owners remain unsupported. |
| Translation 8 `128880489248` | Eight actual-gain cases fail their shared hook. Lines 1061 and 1950: actual workflow/three-repository qualification fails. Line 2019: borrowed `Result` propagation lacks checked residual-error lifetime origins. |
| Reverse Node 2 `128880489230` | Original runtime-import-parent case: 73,216.518 ms against 60 seconds. |
| Reverse Node 3 `128880489197` | Original JSON scalar-fold case: 75,286.181 ms against 60 seconds. |
| Reverse Node 7 `128880488963` | Original ASCII case: 113,699.162 ms against 60 seconds. |
| Reverse Node 8 `128880489138` | Original base64 case: 112,175.092 ms against 60 seconds. |
| Reverse Bun 4 `128880489224` | Artifact `13636667983`, `0002-native-nullable.test.mjs.stderr.raw.log`, line 3: first original nullable/integer-goldens case took 5,289.55 ms against its implicit 5 seconds. |
| JavaScript fully green `128897221789` | Fails because required JavaScript dependencies did not all pass. Rust remains gated. |

Both profile producers were cancelled at their original one-hour job limits:
`128880489036` and `128880489151`, each at log line 282. Their upload steps
find no draft directory at line 296. Reverse Node shards 1 and 5 and Bun
shards 1 and 5 were cancelled at their original job limits. Forward shard 7's
individual log is unavailable as described above. No cancellation is a pass.

The coordinated local batch addresses the whole-source producer adoption and
the actual record-binding defect. The complete original ASCII Node case now
takes 49,748.538 ms under its unchanged 60-second deadline; all 13 owning
producer receiving cases pass under Node. Bun receiving cohorts hit the
unchanged resource guard and remain unqualified. The new binding regression
failed before the repair; the complete 46-case conversion cohort now passes
under both engines. These focused results do not qualify complete application
parents or any new CI head. Their full evidence and remaining limits are in
the separate source-origin and conversion-regression reports.

No missing secret or human-only access requirement has been established.
No code check, test body, original deadline, compiler strictness, resource
guard or publication gate was weakened. Full canonical generation, current
compiler registration, complete gate, parity and the issue-wide privacy
requirements remain unfinished. No local Rust tool ran.
