"""Move closed complete diagnostics once; preserve their original input paths."""
import gzip
import hashlib
import json
from pathlib import Path

base = Path('ci-logs/issue-784-restart-2')
target = Path('docs/case-studies/issue-784/evidence/e881-repair-diagnostics-20261110')
paths = set()
for pattern in ['private-*', 'freeze-cohort-*', 'e881-repair-workflow-*', 'freezer-vector-workflow-*']:
    paths.update(p for p in base.glob(pattern) if p.is_file())
paths.update(p for p in (base / 'freeze-cohort-before-vectors').rglob('*') if p.is_file())
assert 20 < len(paths) < 256 and not target.exists()
rows = []
for p in sorted(paths):
    state = p.lstat()
    assert p.is_file() and not p.is_symlink() and state.st_nlink == 1
    raw = p.read_bytes()
    rows.append(dict(originalPath=str(p), path=str(target / p.relative_to(base)),
                     bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest()))
for p, row in zip(sorted(paths), rows):
    destination = Path(row['path'])
    destination.parent.mkdir(parents=True, exist_ok=True)
    assert hashlib.sha256(p.read_bytes()).hexdigest() == row['sha256']
    p.rename(destination)
    assert hashlib.sha256(destination.read_bytes()).hexdigest() == row['sha256']
receipt = dict(schema='complete-e881-repair-diagnostics-custody-v1', files=rows,
               completeReadbackVerified=True, movedWithoutContainerDuplicates=True,
               freezerFailureReproduced=False, privateCompilerBoundRepaired=False,
               guardPerformanceQualified=False, fullGatePassed=False)
raw = json.dumps(receipt, separators=(',', ':')).encode()
with (target / 'custody.json.gz').open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress((target / 'custody.json.gz').read_bytes()) == raw
print(json.dumps(dict(files=len(rows), bytes=sum(row['bytes'] for row in rows),
                     target=str(target), completeReadbackVerified=True)))
