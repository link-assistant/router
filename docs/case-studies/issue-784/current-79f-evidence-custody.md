# Published checkpoint evidence custody

Nine inactive task archives were removed from the working tree after verifying
their complete SHA-256 streams against the identical published Git blobs at
[`79f375ed1d9690ab8336e06a28331c2871092eb0`](https://github.com/link-assistant/router/tree/79f375ed1d9690ab8336e06a28331c2871092eb0/docs/case-studies/issue-784/evidence/current-9b6-repair-batch).
This retired 82,716,465 logical bytes and 82,739,200 allocated bytes locally.
The original complete archives remain in that immutable published commit.

The retained [whole-stream receipt](evidence/current-79f-published-retirement-20261110.json.gz)
records each original path, byte count, SHA-256, Git blob identity, fresh GitHub
metadata and permanent download link. The
[completion receipt](evidence/current-79f-published-retirement-complete-20261110.json.gz)
records the completed deletion and the whole-stream receipt's SHA-256. Every
local file's ownership, identity, bytes and inactivity were checked again before
deletion. No active build, lock or other worker's files were removed.

This custody change creates room for the next complete CI failure collection
within the task's 500 MB evidence budget. All previous failed checks remain
failed; retaining an archive in published Git does not qualify its contents.
