"""Preserve the complete terminal checkpoint evidence, with verified member bytes."""
import gzip
import hashlib
import io
import json
from pathlib import Path
import tarfile

base = Path('ci-logs/issue-784-restart-2')
names = [
    'current-d310-final-cycle.json.gz', 'current-d310-final-cycle.log',
    'current-d310-terminal-view.json', 'current-d310-terminal-workflows.json',
    'current-d310-terminal-artifacts.json', 'current-d310-collection-8.json.gz',
    'current-d310-terminal-whole-run.zip', 'current-d310-terminal-whole-run-verification.json',
    'current-d310-canonical-inspection.json.gz',
    'current-d310-terminal-forward-7-recovery.log',
    'current-d310-terminal-forward-7-recovery.stderr',
]
names += ['current-d310-deadline-inspection-' + suffix + '.json.gz'
          for suffix in ['1', '2', '3', '4', '5', 'terminal']]
cycle = json.loads(gzip.decompress((base / names[0]).read_bytes()))
assert cycle['allTerminalResultsCollected'] and cycle['allArtifactsInspected']
for row in cycle['availableLogs'] + cycle['unavailableLogs']:
    for field in ['log', 'stderr']:
        path = Path(row[field])
        assert path.parent == base
        names.append(path.name)
names = sorted(set(names))
assert len(names) < 128
target = Path('docs/case-studies/issue-784/evidence/current-d310-terminal-ci.tar.gz')
assert not target.exists()
members, total = [], 0
with target.open('xb') as output, gzip.GzipFile(fileobj=output, mode='wb', mtime=0) as zipped:
    with tarfile.open(fileobj=zipped, mode='w|') as archive:
        for name in names:
            raw = (base / name).read_bytes()
            total += len(raw)
            assert total <= 64 * 1024 * 1024
            members.append(dict(path=name, bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest()))
            info = tarfile.TarInfo(name)
            info.size, info.mode = len(raw), 0o644
            archive.addfile(info, io.BytesIO(raw))
assert target.stat().st_size <= 16 * 1024 * 1024
with tarfile.open(target, 'r:gz') as archive:
    assert archive.getnames() == names
    for row, member in zip(members, archive.getmembers(), strict=True):
        raw = archive.extractfile(member).read()
        assert len(raw) == row['bytes'] and hashlib.sha256(raw).hexdigest() == row['sha256']
receipt = dict(schema='complete-terminal-ci-evidence-archive-v1', path=str(target),
               bytes=target.stat().st_size, sha256=hashlib.sha256(target.read_bytes()).hexdigest(),
               decodedBytes=total, members=members, everyMemberReadbackVerified=True,
               headSha=cycle['headSha'], runId=cycle['runId'], rustExecuted=False,
               fullGatePassed=False, runtimeParity=False)
target.with_suffix('.receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps({key: value for key, value in receipt.items() if key != 'members'}))
