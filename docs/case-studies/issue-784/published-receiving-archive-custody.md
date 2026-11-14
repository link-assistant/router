# Published receiving archive custody

Four complete receiving archives remain preserved at immutable published commit
`74f62c037a21e4b3e4e3804dcf3d941d0aabfe19`:

- [Phased clone](https://github.com/link-assistant/router/blob/74f62c037a21e4b3e4e3804dcf3d941d0aabfe19/docs/case-studies/issue-784/evidence/phased-clone-complete.tar.xz)
- [Export repair](https://github.com/link-assistant/router/blob/74f62c037a21e4b3e4e3804dcf3d941d0aabfe19/docs/case-studies/issue-784/evidence/export-repair-complete.tar.xz)
- [Matrix draft](https://github.com/link-assistant/router/blob/74f62c037a21e4b3e4e3804dcf3d941d0aabfe19/docs/case-studies/issue-784/evidence/matrix-draft-complete.tar.xz)
- [Runtime freeze](https://github.com/link-assistant/router/blob/74f62c037a21e4b3e4e3804dcf3d941d0aabfe19/docs/case-studies/issue-784/evidence/runtime-freeze-complete.tar.xz)

The task's inactive local copies are retired after verifying the remote immutable
Git tree, complete blob identity, byte count and SHA-256, regular-file ownership,
single-link status, active descriptors and mappings, and unchanged state before
removal. The [full retirement receipt](evidence/published-receiving-archive-local-retirement.json.gz)
records each immutable URL and digest. The operation reclaims 56,795,064 logical
bytes and 56,803,328 allocated bytes without rewriting history or removing any
foreign or active build path. Existing documentation now links to the preserved
original archives. This storage operation establishes no new behavior, passing
deadline, source freshness or parity qualification.

The released evidence allocation permits custody of the complete 58,474,945-byte
canonical CI artifact from [run 42560989296](https://github.com/link-assistant/router/actions/runs/42560989296).
Its 2,873 nested outputs are separately checked against the actual plan; current
working-tree freshness and all remaining CI failures still require resolution.

Three further inactive diagnostic copies are retired by the same complete
immutable-blob, ownership and active-use checks: the current real-source fixture
packet, whole-file shard packet and fingerprint trace packet. Their original
bytes remain in the same published commit and history, and their three report
links now select that immutable commit. The [separate complete receipt](evidence/published-diagnostic-packet-local-retirement.json.gz)
records every original URL and SHA-256. This reclaims 30,903,464 logical bytes
and 30,912,512 allocated bytes to keep the final current-cycle custody below
500,000,000 bytes. No original observation or qualification is changed.
