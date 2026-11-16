# Timing evidence and reproduction

Frozen source head: `5fa93ebf9e2b7b402338bb186c196b4a90e76bfe`.
Population boundary: the first parent of #761 merge
`07901ad24576e7f045270fe62ac56f8a72446c53`.
Dates in subjects and author times do not determine cadence; committer times do.

| File | Individual records |
| --- | ---: |
| [commits-01.jsonl](commits-01.jsonl) |250 |
| [commits-02.jsonl](commits-02.jsonl) |250 |
| [commits-03.jsonl](commits-03.jsonl) |250 |
| [commits-04.jsonl](commits-04.jsonl) |250 |
| [commits-05.jsonl](commits-05.jsonl) |250 |
| [commits-06.jsonl](commits-06.jsonl) |250 |
| [commits-07.jsonl](commits-07.jsonl) |250 |
| [commits-08.jsonl](commits-08.jsonl) |250 |
| [commits-09.jsonl](commits-09.jsonl) |250 |
| [commits-10.jsonl](commits-10.jsonl) |250 |
| [commits-11.jsonl](commits-11.jsonl) |250 |
| [commits-12.jsonl](commits-12.jsonl) |149 |
| [first-parent.jsonl](first-parent.jsonl) |990 integration-spine records, overlapping the population above |

Each complete record retains SHA, author/committer ISO timestamps, parents,
subject, inferred work class and its basis, chronological previous SHA/gap,
first-parent gap and whether that parent is inside the population. A boundary
parent outside the population yields a null parent gap, not zero. First-parent
integration rows across merges hide branch work; chronological ancestry rows
can interleave different branches. Neither gap is an active-work measurement.

[metrics.json](metrics.json) retains aggregate populations, disjoint branch-phase
statistics, daily UTC counts and title-class counts. The JSONL records preserve
all branch steps in addition to the human-readable integration tables.
[manifest.json](manifest.json) records byte counts and SHA256 of frozen data,
authoring source and step tables. Hashes establish stored artifact identity only.

The [report-data authoring script](rebuild-report-data.py) uses standard Python
metadata arithmetic and writes this report's evidence/step tables. It imports
no application, parser, compiler, translator or test module. Its title classifier
is deterministic and precedence-based; it is navigation, not evidence that the
selected title class caused the observed delay. The main report documents
source-backed causes separately. The script's metadata exports must be produced
from the frozen Git range, not an advancing HEAD.

To reproduce from any checkout containing these commit objects, export the
following records from the repository root into a small task-owned temporary
directory (shown as `/private/tmp` here). Git metadata is sufficient; no package
installation, application execution or raw CI artifact access is needed:

```sh
git log --format='%H%x09%aI%x09%cI%x09%P%x09%s' 07901ad24576e7f045270fe62ac56f8a72446c53^1..5fa93ebf9e2b7b402338bb186c196b4a90e76bfe > /private/tmp/router-task-commits-20261106.tsv
git log --first-parent --format='%H%x09%aI%x09%cI%x09%P%x09%s' 07901ad24576e7f045270fe62ac56f8a72446c53^1..5fa93ebf9e2b7b402338bb186c196b4a90e76bfe > /private/tmp/router-task-first-parent-20261106.tsv
git log --format='%H%x09%aI%x09%cI%x09%P%x09%s' 07901ad24576e7f045270fe62ac56f8a72446c53^1..07901ad24576e7f045270fe62ac56f8a72446c53 > /private/tmp/router-phase-761-20261106.tsv
git log --format='%H%x09%aI%x09%cI%x09%P%x09%s' 07901ad24576e7f045270fe62ac56f8a72446c53..eb2dad1c0a18394dc1aad46413e11401e74eb502 > /private/tmp/router-phase-771-20261106.tsv
git log --format='%H%x09%aI%x09%cI%x09%P%x09%s' eb2dad1c0a18394dc1aad46413e11401e74eb502..5fa93ebf9e2b7b402338bb186c196b4a90e76bfe > /private/tmp/router-phase-775-20261106.tsv
python3 docs/case-studies/issue-759/current/delivery-time-report-20261106/evidence/rebuild-report-data.py --input-directory /private/tmp --output-directory /private/tmp/router-delivery-report-reproduction-20261106
```

The supplied script generated the retained metadata/step source during report
authoring; no application validation was performed. The optional reproduction
command above was not additionally executed as a test. Clean only the named
task-owned exports/reproduction directory after use. No elapsed duration for
this report's writing or publication is inferred from the frozen source head.
