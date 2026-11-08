# Bounded large-file cache advice controls

[PR #785](https://github.com/link-assistant/router/pull/785) remains unfinished.
The previous whole gate stopped during fingerprinting before any of its seven
stages ran. Its closed-file advice took about 13 seconds per whole repository
pass, which did not keep the gate below the unchanged cgroup guard.

A subsequent physical census measures 49,072 regular fingerprint inputs totaling
1,866,477,766 bytes. The 1,273 files at least 128 KiB account for 1,427,996,654
bytes. This is a diagnostic census, not an immutable gate-launch snapshot.
Restricting the task-only advice helper to that large-file cohort takes 1.911
seconds under the observer. This preflight does not measure a gate speedup or
qualify its result.

The observer's draft uses this bounded selection with a three-second minimum
interval and the original maximum 12 invocations. The cgroup guard remains
2,866,933,760 bytes. Source hashing, selected inputs, stage commands, test clocks
and original deadlines are unchanged. The helper retains owner, single-link,
regular-file, physical-path and observed open/mapped-file exclusions and checks
descriptor identity and metadata before and after each cache hint. It advises
only task-worktree tracked files; it removes no file or global cache.

All four original launch/refusal/cancellation controls pass. Two additional
finite controls verify that a genuine tracked large file is excluded while
open and mapped, included once closed, and retains its whole SHA-256, inode
and metadata. The [complete control packet](evidence/current-large-page-controls.json.gz)
retains every whole control stream, resource receipt and before/after helper
source. The actual complete gate remains independently required. No Rust tool
was run.
