"""Retain complete failed canonical attempts and coordinated review observations."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tarfile

root = Path.cwd()
base = Path('ci-logs/issue-784-restart-2')
head = subprocess.check_output(['git', 'rev-parse', 'HEAD']).decode().strip()
assert head == '1ec7b77f4447b85b26c3c8e2cb939a0aeef3750d'
paths = sorted({*base.glob('coordinated-canonical-produce*'),
                *base.glob('pre-publish-*-20261110.json'),
                base / 'coordinated-gate-stage-review.json',
                base / 'coordinated-source-review.diff',
                Path(__file__).relative_to(root)})
assert len(paths) <= 32 and all(p.is_file() and not p.is_symlink() for p in paths)
assert sum(p.stat().st_size for p in paths) < 2 * 1024 * 1024
resources = [json.loads(p.read_bytes()) for p in paths if p.name.endswith('.memory.json')]
assert len(resources) == 2
for record in resources:
    assert record['exitCode'] in (134, 143)
    assert record['stopThresholdBytes'] == 2866933760
    for pid in [record['pid'], *record['stoppedOwnedProcessIds']]:
        assert not Path('/proc', str(pid)).exists()
archive = Path('docs/case-studies/issue-784/evidence/coordinated-canonical-attempts-20261110.tar.gz')
receipt = archive.with_name('coordinated-canonical-attempts-20261110.json.gz')
assert not archive.exists() and not receipt.exists()
rows = [{'path': str(p), 'bytes': p.stat().st_size,
         'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in paths]
with archive.open('xb') as target:
    with gzip.GzipFile(fileobj=target, mode='wb', compresslevel=1, mtime=0) as packed:
        with tarfile.open(fileobj=packed, mode='w|') as output:
            for p in paths:
                output.add(p, arcname=str(p), recursive=False)
expected, seen = {r['path']: r for r in rows}, set()
with tarfile.open(archive, 'r|gz') as source:
    for member in source:
        assert member.isfile() and member.name in expected and member.name not in seen
        row = expected[member.name]
        assert member.size == row['bytes']
        assert hashlib.file_digest(source.extractfile(member), 'sha256').hexdigest() == row['sha256']
        seen.add(member.name)
assert seen == set(expected)
record = dict(schema='failed-complete-canonical-attempts-v1', sourceHead=head,
              archive=str(archive), bytes=archive.stat().st_size,
              sha256=hashlib.sha256(archive.read_bytes()).hexdigest(), members=rows,
              resources=resources, canonicalGenerationPassed=False,
              generatedOutputsWritten=False, fullGatePassed=False, rustExecuted=False)
raw = json.dumps(record).encode()
with receipt.open('xb') as target:
    target.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == raw
print(json.dumps({key: record[key] for key in ('archive', 'bytes', 'sha256', 'sourceHead')}))
