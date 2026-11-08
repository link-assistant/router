# Complete CI cycle at 4e9fad88

[PR #785](https://github.com/link-assistant/router/pull/785) remains draft.
[Run 42512128521](https://github.com/link-assistant/router/actions/runs/42512128521)
finished on 2026-11-08 at 19:59:18 UTC. All seven workflows are terminal.
The six supplemental workflows are skipped under the existing draft policy.
The main workflow has 59 terminal jobs: 11 successful, 16 failed, seven cancelled
and 25 skipped. These are failing results, including the required aggregate.

Tested merge `c93398d3a87bed64d1c7b847b87107315f9314d3` has the exact tree
of published head `4e9fad88f28552f9e78da53084e4dcc50fdbe3c3`. Every one of
the 23 nonpassing jobs has a complete verified log. All 25 whole ZIP artifacts
and their 438 members passed full hash and CRC readback. The complete originals
were renamed into [permanent evidence](evidence/ci-4e9fad88/manifest.json),
preserving their bytes and inodes without duplicating 43,126,680 bytes.

| Job | Conclusion | Complete log |
| --- | --- | --- |
| [JavaScript first (same commit) / owned-profile-matrix](https://github.com/link-assistant/router/actions/runs/42512128521/job/128827259340) | cancelled | [current-4e9fad88-job-128827259340.log.gz](evidence/ci-4e9fad88/current-4e9fad88-job-128827259340.log.gz) |
| [JavaScript first (same commit) / typescript](https://github.com/link-assistant/router/actions/runs/42512128521/job/128827259471) | failure | [current-4e9fad88-job-128827259471.log.gz](evidence/ci-4e9fad88/current-4e9fad88-job-128827259471.log.gz) |
| [JavaScript first (same commit) / parity](https://github.com/link-assistant/router/actions/runs/42512128521/job/128827259488) | failure | [current-4e9fad88-job-128827259488.log.gz](evidence/ci-4e9fad88/current-4e9fad88-job-128827259488.log.gz) |
| [JavaScript first (same commit) / translation-freshness](https://github.com/link-assistant/router/actions/runs/42512128521/job/128827259503) | failure | [current-4e9fad88-job-128827259503.log.gz](evidence/ci-4e9fad88/current-4e9fad88-job-128827259503.log.gz) |
| [JavaScript first (same commit) / translation (3)](https://github.com/link-assistant/router/actions/runs/42512128521/job/128827259530) | failure | [current-4e9fad88-job-128827259530.log.gz](evidence/ci-4e9fad88/current-4e9fad88-job-128827259530.log.gz) |
| [JavaScript first (same commit) / reverse-translation (3)](https://github.com/link-assistant/router/actions/runs/42512128521/job/128827259650) | failure | [current-4e9fad88-job-128827259650.log.gz](evidence/ci-4e9fad88/current-4e9fad88-job-128827259650.log.gz) |
| [JavaScript first (same commit) / reverse-translation (1)](https://github.com/link-assistant/router/actions/runs/42512128521/job/128827259704) | cancelled | [current-4e9fad88-job-128827259704.log.gz](evidence/ci-4e9fad88/current-4e9fad88-job-128827259704.log.gz) |
| [JavaScript first (same commit) / profile-matrix](https://github.com/link-assistant/router/actions/runs/42512128521/job/128827259716) | cancelled | [current-4e9fad88-job-128827259716.log.gz](evidence/ci-4e9fad88/current-4e9fad88-job-128827259716.log.gz) |
| [JavaScript first (same commit) / reverse-bun (1)](https://github.com/link-assistant/router/actions/runs/42512128521/job/128827259741) | cancelled | [current-4e9fad88-job-128827259741.log.gz](evidence/ci-4e9fad88/current-4e9fad88-job-128827259741.log.gz) |
| [JavaScript first (same commit) / reverse-freshness](https://github.com/link-assistant/router/actions/runs/42512128521/job/128827259751) | failure | [current-4e9fad88-job-128827259751.log.gz](evidence/ci-4e9fad88/current-4e9fad88-job-128827259751.log.gz) |
| [JavaScript first (same commit) / reverse-translation (2)](https://github.com/link-assistant/router/actions/runs/42512128521/job/128827259767) | failure | [current-4e9fad88-job-128827259767.log.gz](evidence/ci-4e9fad88/current-4e9fad88-job-128827259767.log.gz) |
| [JavaScript first (same commit) / reverse-bun (5)](https://github.com/link-assistant/router/actions/runs/42512128521/job/128827259795) | cancelled | [current-4e9fad88-job-128827259795.log.gz](evidence/ci-4e9fad88/current-4e9fad88-job-128827259795.log.gz) |
| [JavaScript first (same commit) / translation (2)](https://github.com/link-assistant/router/actions/runs/42512128521/job/128827259823) | failure | [current-4e9fad88-job-128827259823.log.gz](evidence/ci-4e9fad88/current-4e9fad88-job-128827259823.log.gz) |
| [JavaScript first (same commit) / translation (5)](https://github.com/link-assistant/router/actions/runs/42512128521/job/128827259856) | cancelled | [current-4e9fad88-job-128827259856.log.gz](evidence/ci-4e9fad88/current-4e9fad88-job-128827259856.log.gz) |
| [JavaScript first (same commit) / reverse-translation (8)](https://github.com/link-assistant/router/actions/runs/42512128521/job/128827259879) | failure | [current-4e9fad88-job-128827259879.log.gz](evidence/ci-4e9fad88/current-4e9fad88-job-128827259879.log.gz) |
| [JavaScript first (same commit) / translation (7)](https://github.com/link-assistant/router/actions/runs/42512128521/job/128827259886) | failure | [current-4e9fad88-job-128827259886.log.gz](evidence/ci-4e9fad88/current-4e9fad88-job-128827259886.log.gz) |
| [JavaScript first (same commit) / translation (4)](https://github.com/link-assistant/router/actions/runs/42512128521/job/128827259920) | failure | [current-4e9fad88-job-128827259920.log.gz](evidence/ci-4e9fad88/current-4e9fad88-job-128827259920.log.gz) |
| [JavaScript first (same commit) / reverse-translation (5)](https://github.com/link-assistant/router/actions/runs/42512128521/job/128827259961) | cancelled | [current-4e9fad88-job-128827259961.log.gz](evidence/ci-4e9fad88/current-4e9fad88-job-128827259961.log.gz) |
| [JavaScript first (same commit) / translation (1)](https://github.com/link-assistant/router/actions/runs/42512128521/job/128827259993) | failure | [current-4e9fad88-job-128827259993.log.gz](evidence/ci-4e9fad88/current-4e9fad88-job-128827259993.log.gz) |
| [JavaScript first (same commit) / translation (6)](https://github.com/link-assistant/router/actions/runs/42512128521/job/128827259997) | failure | [current-4e9fad88-job-128827259997.log.gz](evidence/ci-4e9fad88/current-4e9fad88-job-128827259997.log.gz) |
| [JavaScript first (same commit) / translation (8)](https://github.com/link-assistant/router/actions/runs/42512128521/job/128827260003) | failure | [current-4e9fad88-job-128827260003.log.gz](evidence/ci-4e9fad88/current-4e9fad88-job-128827260003.log.gz) |
| [JavaScript first (same commit) / reverse-translation (7)](https://github.com/link-assistant/router/actions/runs/42512128521/job/128827260033) | failure | [current-4e9fad88-job-128827260033.log.gz](evidence/ci-4e9fad88/current-4e9fad88-job-128827260033.log.gz) |
| [JavaScript first (same commit) / JavaScript fully green](https://github.com/link-assistant/router/actions/runs/42512128521/job/128844392767) | failure | [current-4e9fad88-job-128844392767.log.gz](evidence/ci-4e9fad88/current-4e9fad88-job-128844392767.log.gz) |

The matrix jobs are cancelled after roughly 60 minutes. Their logs report
cancellation and no matrix drafts; the cancellation cause is not established.
No missing secret or inaccessible external resource explains these failures.
No required job, original deadline, refusal or parity obligation is waived.

The last forward shard reports a 60-second original receiving deadline failure
at log line 1681 and the private Rust compiler source byte-bound refusal at
line 2130. The TypeScript sidecar is missing, canonical and owned outputs remain
stale, semantic and reverse deadline failures remain, and strict parity is
unfinished. Local repairs after this head require their own checks and CI.

The [failure-location index](evidence/current-4e9fad88-failure-locations.json.gz)
records all `not ok` log locations and nearby scalar errors. It is a navigation
index; the complete original logs and artifacts remain authoritative. Zero newly
executable production functions is inferred from this evidence. No local Rust
tool was run. Same-SHA JavaScript success remains mandatory before Rust.
