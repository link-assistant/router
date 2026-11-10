# Independent Node translation process trees

Draft toward [PR #785](https://github.com/link-assistant/router/pull/785).
The published `93995ee40be4b570becbe0b788dba58f5bd0ea6f` CI cycle runs two
complete Node files per runner. Each file can start a separate strict TypeScript
compiler. Observed deadline failures include the complete original/current runtime
build comparison at 78,857.387 ms against its original 60,000 ms limit, and the base64
file's case at 92,296.898 ms against 60,000 ms. This evidence does not establish
that resource contention explains every deadline failure.

Both Node translation directions now declare sixteen exhaustive whole-file
shards and one test worker per runner. The total maximum number of active Node
test files remains sixteen per direction. Every discovered current or future
file runs exactly once. The complete source census, before/after source joins,
original test and enclosing job budgets, independent auditor, raw evidence,
unconditional failure handling and same-SHA aggregate remain required. Bun's
eight shards, parity concurrency and all three reverse freshness commands retain
their original settings.

Four additional ordered repository substitutions derive the complete workflow
from its retained historical source. They compose within the existing language
and repository phases, including complete serialized/reparsed YAML CST and exact
full inverses. The audit rejects missing, extra or duplicated bins, matrix
include/exclude filters, fail-fast, additional Node workers, test filters, omitted
files and ignored failures.

Both complete workflow and Node shard-runner test files pass: 45 cases, zero
failures, skips or cancellations. The observed Node 20.20.2 command took
52.178442 s with a sampled total cgroup peak of 1,950,121,984 B. The actual source
producer's `--check` also passes. The lockfile-installed compiler reports
TypeScript 5.9.3. These focused checks do not qualify the complete production
translation cohorts or establish a performance improvement; fresh CI remains
required.

The complete, unfiltered runtime-import parent file was also run locally with
one Node worker and a 512 MiB heap. All seven assertions pass, but its independent
deadline auditor correctly fails the full original/current build case at
190,815.839221 ms against 60,000 ms. The command exits 1 after 263.452759 s;
sampled total cgroup memory peaks at 2,784,690,176 B without a memory interruption.
Every original callback, source reconstruction and full artifact comparison
remains exercised. This result does not qualify that deadline or isolate a
contention effect. The complete TAP, original sources, audit and resource receipt
are retained in the [complete focused packet](evidence/isolated-node-translation-checks.tar.gz)
and [receipt](evidence/isolated-node-translation-checks.json.gz).

The complete gate, strict parity, genuine owned definitions, current generated
freshness, raw compiler closure bound and other original deadlines remain
unfinished. No Rust tool was invoked.
