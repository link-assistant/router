The 14 task-owned receiving performance vector files remain available in the
published commit `910e8dadfbf3f92490f2db19ed47c39d98af7077`. The retirement
receipt records each permanent URL, complete byte length, SHA256 and Git blob.
The GitHub commit API tree matched the local immutable tree; every complete
published blob matched its local copy before retirement. The copies were
regular, singly linked, task-owned and absent from observable process file
descriptors and memory maps. No source or test was removed.

Removing these inactive working copies reclaimed 17,517,073 logical bytes and
17,551,360 allocated bytes within the task's fixed evidence allowance. Original
streams remain in Git history. The receipt is
`evidence/receiving-performance-vectors-local-retirement.json.gz`; the finite
reproducer is `experiments/issue-784/retire-published-performance-vectors.py`.
This storage check grants no semantic or runtime parity and no green gate.
