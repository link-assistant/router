# Inactive metadata custody during the next repair batch

Fifty complete inactive JSON observations from the completed `17c7dd994` CI
cycle now have lossless `.json.gz` successors in the same directories. Append
`.gz` to the original paths in earlier custody manifests to recover their
complete original bytes. The complete [per-file custody receipt](evidence/current-retained-17c7-metadata-compression.json.gz)
records original and compressed hashes, lengths, full readback verification and
inactive-file checks. No source inputs, live outputs or another task's files
were removed. Logical storage fell by 2,882,346 bytes; allocated storage fell
by 2,879,488 bytes. This preserves the task's 500 MB evidence allocation.

The first inactive-page hint attempt stopped at a tracked JSON path that had
already been compressed. Its [complete traceback](evidence/current-ascii-parent-pages.log.gz)
is retained. The helper now skips missing tracked working-tree paths. Its
[corrected complete receipt](evidence/current-ascii-parent-pages-v2.json.gz)
retains the entire file census and before/after cgroup observations. It only
advises inactive ordinary files inside this worktree; it removes no file and
does not clear a global cache. Concurrent memory observations do not measure
exact reclaimed cache bytes. No test clock was paused.

The [publication readback](evidence/current-repair-published-feedback.json.gz)
confirms draft PR [#785](https://github.com/link-assistant/router/pull/785) at
`4e7093eb98b2170bac2cd5fd24c0c777e6bcf4b2`, with the full checkpoint limitations
in its description. Its CI remains independent of these later local changes.
This storage work establishes no semantic admission, gate success or parity.
