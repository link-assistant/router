# Complete forward Node test files in CI

The forward CI cohort repeatedly reaches its original 60-minute job limit
before producing a terminal audit. The local 657-file attempt at clean
`fd960aae3e12882fc12284db18722e6e9376cd83` is interrupted by the unchanged
container memory guard before its reporter produces an audit. These are
incomplete attempts; neither provides successful case or deadline qualification.

CI assigns every discovered whole forward and serialization-schema test file
to exactly one of eight deterministic bins. Each bin receives the complete
sorted source census, selects files by position modulo eight, and invokes the
unchanged `runAuditedNodeTests` implementation. Every test body and its original
deadline stay inside its original complete file. All future matching files join
the census. Missing bins, filtering, duplicate files and empty bins are refused.

`run-node-test-shard.mjs` joins every complete original test source and the
runner/reporter/auditor implementations before execution and again at the final
receipt boundary. A changed file in another bin also fails the invocation.
Source joins, execution and final receipt work share the original enclosing
budget. The shard receipt records the complete census and selection, source
bytes and hashes, original and remaining budgets, and any refusal. Original
terminal receipts, independent deadline audits and full raw streams remain.

The workflow uses all eight explicit bins with `fail-fast: false`, two test
workers per job and the original 60-minute limit. Every artifact name includes
its bin to avoid collisions. All eight results must succeed. Both original
canonical freshness commands run once in a separate unconditional
`translation-freshness` job with the complete original setup and budget. The
aggregate requires twelve logical stages; any failed, cancelled, skipped or
missing result refuses Rust admission. The local gate retains its original
complete unpartitioned cohort, seven stages and every mandatory command.

The workflow is derived from its complete immutable historical source with
ordered `language` and `repository` rules. Both YAML CST boundaries are
serialized and reparsed, native YAML grammar is checked, and the complete
inverse must restore the original. The original fixed-nine caller-selection
archive and producer stay unchanged. New wrapper controls run in both local
and CI lint stages.

The four complete workflow/local/profile/wrapper control files pass under
Node 20.20.2: 54 cases and the independent original-deadline audit. Bun 1.4.4
passes 52 cases; its import cache avoids two repeated profile cases. TypeScript
remains the lockfile-installed 5.9.3. The first complete Node attempt retains
one failed install-order regression and a passing deadline audit; the updated
regression checks installation precedes both independent freshness commands.
No original assertion or deadline is removed or raised. These receiving results
do not establish a complete forward CI pass, a green local gate or parity.

Clean `fd960aae3e12882fc12284db18722e6e9376cd83` also retains the full local gate
failure: all nine native TypeScript behaviors finish, but regeneration takes
105263.83772 ms against its original 60000 ms limit. Acceptance passes 121 cases;
strict parity then fails stale account-policy source data and retains 441 gaps
and 12345 carried items. Memory interruption leaves forward incomplete and
reverse unrun. Every owned process is reaped; no green stamp is issued.

Reverse CI also assigns every original `js-to-rust/test/*.test.mjs` file to
one of eight Node bins and one of eight independent Bun bins. Node keeps two
workers, the original 900000 ms enclosing cohort limit and all independent
case-deadline audits. Each job keeps its original 15-minute limit. A separate
unconditional `reverse-freshness` job runs all three original regeneration
commands exactly once with the complete original setup and 15-minute budget.
Every bin and the freshness result must succeed before Rust can start.

`prepare-bun-reverse-shard.mjs` derives the separate Bun shard coordinator
from the entire unchanged `run-bun-reverse-files.mjs` source. Ordered language
and repository substitutions cross serialized/reparsed complete JavaScript
CST boundaries, check native syntax and restore the entire original inverse.
The generated coordinator preserves fresh sequential child processes, exact
whole-file Bun arguments, the original case deadlines and the 40-minute
coordinator cap. The workflow's shorter enclosing limit remains effective.
Both complete current discovery and the selected bin are retained; all original
input files, including other bins, are joined before and after execution.
New, removed, changed or unrun mandatory files still fail. Node and Bun artifact
names include the bin, and each engine retains its full original raw receipts.

The local gate retains the original unpartitioned reverse API, every original
test file and all three freshness commands. The new producer freshness and
complete coordinator controls are additional mandatory local and CI lint
checks. Focused receiving results and actual same-SHA CI results are recorded
separately; this orchestration does not establish executable runtime parity.

The eight complete affected control files pass under Node 20.20.2: 82 cases
in 84.216753 seconds, with a passing independent audit, 17 original finite
deadlines and no unobserved deadlines or breaches. Bun 1.4.4 passes 80 cases
in 66.051793 seconds; two repeated imports are cached. Peak sampled cgroup
use is 2181545984 and 2189271040 bytes respectively. Both complete original
coordinator checks and both new producer freshness checks pass; the workflow
audit accepts all fourteen workflows. Installed TypeScript is 5.9.3. These
focused controls do not qualify the complete 49-file reverse cohort or its
actual same-SHA CI jobs.
