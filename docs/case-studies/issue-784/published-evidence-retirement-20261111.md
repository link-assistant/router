# Published evidence copies retired locally

Five inactive task-owned archive copies were removed after their complete bytes
were independently matched to the published Git blobs at
`124edb33e096a2c018caf449214005ad555d8bdd`. Their existing case-study pages now
link directly to those immutable complete archives. Original verification
receipts and repository history remain available.

The [complete retirement receipt](evidence/published-legacy-receiving-20261111-local-retirement.json.gz)
records every path, remote tree/blob witness, full length and SHA-256, stable
local file identity and process-descriptor inspection. Only the five named
inactive files from this task were removed. The operation reclaimed 15994458
logical bytes and 16003072 allocated bytes. No Rust cache, another worker's
path or active lock was removed.

This storage operation creates room under the existing 500000000-byte evidence
allocation; it grants no source, parity, full-gate or publication qualification.
The earlier [complete-gate evidence-cap violation](current-8aa-complete-gate.md)
remains recorded. [PR #785](https://github.com/link-assistant/router/pull/785)
remains unfinished and draft.
