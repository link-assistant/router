# Complete-project storage receiving investigation

Source under investigation: `84779613d2a334d131083c4bb4eff7f1680e8add`.
This is independent receiving work while that head's CI runs. It does not
replace the complete gate, qualify Rust, or establish additional executable
Router functions.

Fresh CI confirms that the three profile TypeScript trees compile strictly
with TypeScript 5.9.3 after the profile inventory fix. The next required command
refuses the absent complete owned-definition matrix index. Genuine generation
and reverse reconstruction remain required; an empty index would conceal the
failure. The ordinary profile generation job and its original 2048 MiB worker
heap are separate from that missing-index diagnostic.

The existing [owned-field storage proposal](../../development/owned-field-bulk-storage.md)
provides a sibling CLI and nine materialized source files. Its source presence
does not establish successful full-corpus generation. The proposed storage
schedule is explicitly different from arbitrary legacy observers. No existing
CLI route, CI command, test deadline, heap literal or parity assertion was
changed in this investigation.

## Complete receiving files

Checks use the checksum-verified official Node 20.20.2 binary, the lockfile
TypeScript 5.9.3 installation, and Bun 1.4.4. Node uses a 768 MiB old-space
heap and one test worker. The original Node coordinator retains its independent
source-declared deadline audit. The task-owned observer samples total cgroup
memory every 0.1 seconds, below the container's 3135369216-byte cap; its samples
are neither child RSS nor an exact peak. It keeps the existing subreaper alive
when stopping its own descendants, and never signals another process group.

| Complete selection | Observation | Qualification |
| --- | --- | --- |
| `owned-field-bulk.test.mjs`, Node | 6/6 cases; independent deadline audit passes; sampled cgroup maximum 1575821312 bytes | Small complete artifact, source/CST/inverse and CLI cases pass |
| Same complete file, Bun | 6/6 cases; sampled cgroup maximum 2176933888 bytes | Same bounded receiving cases pass |
| Five unchanged dependencies below, Node | 39/39 TAP passes, but independent deadline audit fails; sampled cgroup maximum 2840969216 bytes | Failed deadline qualification, no memory stop |
| Same five complete files selected, Bun | 35 reported passes before an owned-process memory stop at 2872123392 sampled cgroup bytes; exit 143 | Incomplete and failed; remaining cases unqualified, no unchanged repeat |

The five dependency files are `compressed-project-meta-storage.test.mjs`,
`project-meta-utf8-storage.test.mjs`, `private-output-text.test.mjs`,
`isolated-matrix.test.mjs`, and `matrix-bulk.test.mjs`, all under
`tools/translation/test/`. Their full file contents and assertions were retained.
The original matrix CLI case at `matrix-bulk.test.mjs:98` took
34678.783762 ms against its unchanged 30000 ms deadline. A synchronous Node
pass does not waive this failure. All four isolated profile variants and the
source-change, staged-byte, symlink and private-handle refusal cases passed
within their declared deadlines.

The complete raw Node receipt directories are `complete-gxIRzY` (six storage
cases) and `complete-6DRRpL` (five dependencies), under
`js/node_modules/.node-case-deadlines/`. Logs and memory receipts are retained
under `ci-logs/issue-784-restart-2/`. The checks use
`experiments/issue-784/run-observed-check.py`; that observer supplies resource
diagnostics and does not replace source-declared deadlines.

The full isolated CLI receiving, genuine Router generation, reverse
regeneration, strict parity and complete gate are not qualified by these
observations. The earlier OOM after `project-serialize`
still does not identify storage as the allocation site: that event precedes
construction of generated method facades. No repaired OOM or memory saving is
claimed.
