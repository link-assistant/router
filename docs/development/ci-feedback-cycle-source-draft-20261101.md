# Deferred complete-cycle evidence collection

This is source drafted tooling for Q05, T05 and J04/J05. It has not been run.
Do not invoke it or inspect CI feedback during the current bulk-drafting phase.
Its existence does not close Q05: actual workflow/member binding, complete raw
case/deadline interpretation, shared-cause diagnosis and later current-SHA
receiving evidence remain required. All 70 requirement statuses are unchanged.

`scripts/ci-feedback-cycle.mjs` exposes `collectFeedbackCycle` and
`classifyFeedbackCycle`. The former takes an explicit exact full SHA, repository,
expected workflow IDs and an adapter. It retains every returned run for that SHA,
including supplemental workflows, and refuses unfinished runs. It never cancels
work, reruns jobs, changes workflow source, posts a message, pushes or merges.
Expected workflow IDs are required so an empty or filtered result cannot become
an apparently complete cycle. GitHub's API permissions and retention remain an
external boundary: the caller must independently establish the expected workflow
inventory and access scope from the exact committed workflow sources.

Collection retains unmodified paginated API responses, exact-SHA workflow YAML
(including the reusable JavaScript gate), complete job log bytes and artifact
ZIP bytes. All opening/closing run metadata, actual run attempts, job metadata,
step outcomes, artifact identities/expiry and complete raw bytes are kept.
Every numbered attempt from one through the observed latest attempt is captured
through its attempt-specific REST endpoint, including earlier failed attempts
after a successful rerun. Opening/closing attempt metadata is retained too.
The job response need not contain a `run_attempt` field: the requested attempt
endpoint supplies that context, and any field present must agree. Older failed
streams remain visible as historical unassigned failures when current gate
bindings identify the latest attempt; a reviewer explicitly reconciles their
resolution rather than silently dropping them.
Pagination validates advertised totals, duplicates, short pages and count bounds.
A closing capture must reproduce the opening run/job/artifact identity and
status vector. A new run, rerun, status change or artifact replacement refuses.
This is an observed stable interval, not a promise that a future workflow cannot
start after capture. Recollect a new cycle after publishing a new SHA or rerun.

The capture limit is five minutes, 100 pages per list, 256 runs and 256 total attempts, 4,096 jobs and
4,096 artifacts per run, 64 MiB per raw component and 128 MiB aggregate, counting
both metadata fences and the final manifest. Crossing a bound refuses rather
than truncating or omitting evidence. Expired artifacts and HTTP 403/404/410
responses remain explicit missing evidence; other failures propagate. The
command returns nonzero for incomplete evidence. It does not unzip artifacts,
execute archived code, parse a test report as a proof, or infer an elapsed-time
pass from an exit code. The later reviewer must inspect complete original raw
and deadline receipts, including cancelled/missing/unrun files and every matrix
member, without reducing the workload or raising a deadline.

The deferred CLI is `scripts/collect-ci-feedback-cycle.mjs`. A later authorized
operator supplies `--repository link-assistant/router --sha FULL_SHA`, one or
more `--workflow-id NUMERIC_ID` options and `--output NEW_PRIVATE_DIRECTORY`.
Use `GH_TOKEN` or `GITHUB_TOKEN`; token bytes never enter evidence or error text.
Do not run that command now. Its GitHub adapter streams responses under byte
limits, authenticates only the API request, strips credentials on a separately
validated HTTPS artifact redirect, and refuses further redirects. It creates a
new mode-0700 evidence directory and writes each acquisition immediately with
exclusive mode-0600 files. Existing destinations are refused. `INCOMPLETE` is a
permanent initial marker: a subsequently written `COMPLETE.json` means the
collection reached publication, while its `completeEvidence` field still
records any gaps. On interruption/failure, already written raw evidence stays
in place for review; there is no cleanup that could erase a failed attempt.
These files are diagnostic evidence under a cooperating writer boundary, not a
crash-atomic installation, a cryptographic verdict or an adversarial filesystem
ownership protocol. No generated application artifact is installed.

Classification requires an explicit reviewed job-ID/run-ID/attempt mapping to
each of the eight stage IDs and eleven fixed members (translation has three;
profile-matrix has two). Display names cannot identify a gate. Duplicate member
bindings, reuse of one job for two members, unknown members and wrong attempts
refuse. Missing members, non-success outcomes, evidence gaps and unassigned
failures remain visible. The generated repair worklist lists conservative
requirement IDs to reopen and complete raw references. Its initial cause is
explicitly unclassified: a later human/source review groups common causes from
the full evidence rather than guessing from a log substring. Reopening is a
proposed tracking action, never an automatic checklist rewrite.

Both outputs fix `rustAdmission: false` and `verificationQualified: false`.
Neither a successful capture nor eleven successful mapped jobs independently
proves the effective workflow, exact mandatory commands, source pins, full
workloads or original deadlines. Existing independently audited same-SHA gates
remain the sole CI scheduling requirements, and Rust failures remain fatal.
The reporting tool is not an application translator: source substitutions,
CST/meta semantic admission and Rust behavior oracles are inapplicable here.
No translator lane, workflow, immutable source-history profile or command was
changed. Original tests and deadlines remain untouched.

Independent source in `scripts/test/ci-feedback-cycle.test.mjs` covers retained
raw bytes and original step data, source/attempt mismatches, failed and skipped
jobs, unknown/unfinished workflows, closing reruns and artifact changes,
incomplete pagination, expired/inaccessible evidence, primary failures and
abort reasons, explicit eleven-member mapping, duplicate jobs, missing members,
unassigned failures, credential-free redirects and streamed byte bounds. All
cases are UNRUN; no network request, fixture, Node/Bun process, parser, compiler,
translator, preparer or CI read was executed to draft these files.

API contracts were reviewed against the public GitHub REST documentation, with
no repository CI response accessed: [workflow run filters and attempts](https://docs.github.com/en/rest/actions/workflow-runs),
[attempt-scoped jobs and plain log redirects](https://docs.github.com/en/rest/actions/workflow-jobs),
and [artifact metadata and ZIP download](https://docs.github.com/en/rest/actions/artifacts).
This documentation review is not a live API or receiving test.

`tools/translation/test/ci-feedback-cycle-20261101.test.mjs` imports the entire
independent control file, preserving every case under both unchanged complete
forward Node/Bun schedules. Each control has a 60-second case deadline. It uses
in-memory adapters only; importing the CLI does not invoke it or access CI.
No workflow command, member or selection was changed. Scheduling source is not
evidence that either engine has executed or passed the cases.
