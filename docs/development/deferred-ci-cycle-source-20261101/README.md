# Deferred complete-cycle failure collection source

Status: SOURCE DRAFT / UNRUN. No current CI result, log, artifact or review was
read to author this batch. This is Q05 bookkeeping, separate from translator
semantics, coverage and the immutable eight-stage JavaScript gate.

`tools/translation/deferred-ci-failure-cycle.mjs` provides
`proposeDeferredCiFailureCycle` and `proposeReopenedDraftChecklist`.
`scripts/collect-deferred-ci-cycle.mjs` is the future read-only GitHub CLI caller.
It refuses before network access unless all70 numbered source rows are DRAFTED.
After separately authorized verification begins, the explicit invocation is:

```sh
node scripts/collect-deferred-ci-cycle.mjs FULL_WORKFLOW_HEAD_SHA FRESH_DIRECTORY
```

Do not execute this during drafting. Supply an exact workflow API head SHA.
A pull-request merge source SHA can differ from this API head SHA. The report
keeps `testedSourceShaVerified:false` and `rustGatePermit:false`: workflow-head
collection never substitutes for the original immutable checked-out-SHA verifier
or any of the eight same-SHA stages. No workflow or gate command is changed.
The existing whole policy test file imports the new whole independent case file.

The collector enumerates all workflows returned for the explicit head, retains
every attempt from1 through the actual latest rerun, and requires the primary
release workflow to be present. Other workflow scopes can be explicitly added
through the API. All enumerated runs and jobs are included even when optional,
failed, cancelled, pending or skipped. Unexpected workflows are retained.
It joins every job to actual run ID, attempt and head, then compares complete
normalized run/job/step snapshots before and after fetching logs. A moving or
incomplete cycle is never repair-ready. Collection describes one observed time;
new future workflow runs require another collection.

Every API JSON response and failed-job raw log is retained separately. Complete
base64 in the report preserves invalid UTF8 and CRLF bytes. Earlier failed reruns
stay visible and only latest-attempt failures schedule current repair proposals.
Skipped/neutral work stays explicit. Run-level failures without failed-job
provenance block repair readiness. Missing, truncated, unjoined or unavailable
logs cannot be silently treated as complete. API failures retain available raw
stdout/stderr and propagate the primary exception; no later command runs.

Classification is a conservative repair proposal from complete workload labels
and failed step names. It maps known families to requirement IDs and retains
Q01/Q05 for an unclassified failure. A source reviewer still diagnoses the full
raw failure. The proposed complete checklist changes affected receipt-linked
DRAFTED rows back to OPEN and retains the full original checklist inverse;
installation is explicit. Nothing automatically commits, pushes, edits source,
retries CI, cancels runs, compiles code or starts Rust.

Limits remain explicit:120s whole collection,20s per read,20 pages of100 API
records,2000 total attempts,100 attempts per run,16MiB per API/log record,
128MiB decoded failed logs and160MiB total retained evidence. Require512MiB free
before collection. Hitting a bound fails and preserves already written evidence;
these are refusal bounds, not permission to truncate a run or claim completeness.
A fresh directory prevents overwriting evidence. No dependencies are installed.

The independent seven-case file covers exact raw evidence/fallback reopening,
missing/moving/pending/truncated inputs, earlier reruns, resource/TypeScript
classification, skipped/run-only/forged joins, the pre-network drafting guard,
and binary logs with exact full checklist inverse/idempotence. All are UNRUN.
Existing policy-harness cases remain intact and scheduled as the whole file.

The full source archive records all three added files and complete policy-harness
before/after/inverse sources. SHA256:
`cca3ad4e5004f90516d753bead47f2683570ded086d93df84e21da004c286ed9`
(125,305 decoded/29,844 packed bytes). This archival DATA does not claim an
executed CST or semantic proof. No application source is translated in this
bookkeeping lane, so Rust/JS/TS semantic lowering, native oracles and private
compiler issuers are inapplicable here; all original translator requirements
remain separate. Verification of the complete case file and actual collector
remains deferred with every other new source addition.
