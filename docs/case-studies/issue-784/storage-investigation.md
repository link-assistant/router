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
| `owned-field-isolated-matrix-cli.test.mjs`, Node | 2/4 passes; both retained cases fail a 20000 ms child deadline; the retained check case also takes 60388.399697 ms against 60000 ms | Failed CLI and independent deadline qualification; sampled cgroup maximum 2327355392 bytes, no memory stop |
| Same complete four-case CLI file, Bun | 4/4 passes within original deadlines; sampled cgroup maximum 2555723776 bytes | Small three-profile CLI comparisons pass; the Node failures remain |

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
cases), `complete-6DRRpL` (five dependencies), and `complete-JBpbi9` (four CLI
cases), under
`js/node_modules/.node-case-deadlines/`. Logs and memory receipts are retained
under `ci-logs/issue-784-restart-2/`. The checks use
`experiments/issue-784/run-observed-check.py`; that observer supplies resource
diagnostics and does not replace source-declared deadlines.

The four CLI cases preserve all three genuine profiles and complete original
reports, generated artifact bytes, check-mode nonmutation and nested-payload
mutation refusals. All eight full input/output vectors, including the failed
Node child commands and partial outputs, are retained as losslessly compressed
JSON under `owned-field-matrix-cli-{node20,bun}-vectors`. Node's retained-write
failure occurs in the original CLI; its retained-check failure occurs in the
sibling CLI. Neither is waived by the other engine's success.

The full isolated CLI receiving, genuine Router generation, reverse
regeneration, strict parity and complete gate are not qualified by these
observations. The earlier OOM after `project-serialize`
still does not identify storage as the allocation site: that event precedes
construction of generated method facades. No repaired OOM or memory saving is
claimed.

## Actual owned-definition generation

The existing production command was attempted at local source `07db1eadb`,
whose production compiler bytes equal published head `84779613d`:

```sh
NODE_OPTIONS=--max-old-space-size=2048 node scripts/translate-router.mjs --retain-output-text --owned-core-definitions --progress
```

The invocation used the checksum-verified Node 20 binary and the same observer.
It discovered all 864 tracked Rust files and three Cargo inputs, resolved the
397-module library graph, and reached `derive-namespace-context` at 68186 ms.
The observer stopped its owned descendants after 102.212 seconds at
2868981760 sampled total cgroup bytes, preserving the subreaper until cleanup.
Exit 143 is an interrupted generation, not successful output qualification.
The full log and receipt are `owned-generation-node20.log` and
`owned-generation-node20-memory.json` in the same evidence directory.

This stop precedes namespace construction completion, project serialization
and output writing. The working tree remained clean. It therefore does not
attribute that allocation to output storage, produce the missing matrix index,
or qualify the sibling storage CLI. The unchanged production workload must not
be repeated in this container; its early memory pressure needs a separately
verified implementation repair or an adequately provisioned receiving runner.

After every local child closed, `cleanup-storage-toolchain.py` verified the
archive and executable checksums, checked live task process commands and maps,
and removed only this temporary Node copy. The full `storage-node-cleanup.json`
receipt records distinct allocation and filesystem free-space observations;
no Rust cache or another worker's path was removed.
