# Published 74f62 artifact copies

The 25 complete artifact ZIPs collected from the terminal `74f62c037` CI cycle
remain available at immutable published commit
[`3b19785353c0a004efc62ab675a97b99c8a2e5a1`](https://github.com/link-assistant/router/tree/3b19785353c0a004efc62ab675a97b99c8a2e5a1/docs/case-studies/issue-784/evidence/ci-74f62).
Their local working-tree copies were retired to keep new observations below the
500,000,000-byte evidence allocation. The complete whole-run ZIP, every available
complete job log, all verification receipts and the original collection manifest
remain local. The unavailable forward-shard-5 log remains an explicit gap.

The [complete retirement receipt](evidence/ci-74f62-artifact-local-retirement.json.gz)
records every immutable individual download URL, complete-file SHA-256, Git blob,
length and allocated size. Before removal, all 25 blobs were read in full and
matched against the complete published GitHub directory tree and physical files.
Only unchanged, single-link, task-owned regular files with no observable open
descriptor or mapping were removed. No history, other worker path, build cache
or active artifact was removed.

This reclaims 92,702,297 logical and 92,758,016 allocated bytes. It changes no
compiler result, original deadline, strict gate or qualification. [PR #785](https://github.com/link-assistant/router/pull/785)
remains draft.
