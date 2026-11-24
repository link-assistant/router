# Complete custody of inactive unit fixtures

Four task-owned `/tmp/router-owned-unit-matches-data-*` fixture directories
were inactive when inspected. Their complete contents, including directory and
symlink metadata, are retained in
[the archive](evidence/current-unit-fixtures-complete.tar.gz) and
[the receipt](evidence/current-unit-fixtures-complete.json.gz).
Every archived member was read back and its type, size, bytes or link target
checked before deletion. Ownership, original file identity and process activity
were checked again before removing these four directories only.

The cleanup retired 3,741,609 logical bytes and 4,988,928 allocated bytes. The
2,831,179-byte compressed archive remains locally available. This cleanup does
not change the recorded failure of the original complete Node unit test, which
exhausted its JavaScript heap. Its original failure evidence remains retained.

The reproducible cleanup procedure is
[`retain-inactive-unit-fixtures.py`](../../../experiments/issue-784/retain-inactive-unit-fixtures.py).
It refuses existing destinations and active or unexpected source paths.
