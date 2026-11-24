"""Finite open/mapped and closed-file controls for task-only page advice."""
import gzip
import hashlib
import json
import mmap
from pathlib import Path
import subprocess
import sys

base = Path('ci-logs/issue-784-restart-2')
path = Path('docs/case-studies/issue-784/evidence/current-unicode-registration-refresh.json.xz')
before = path.stat()
digest = hashlib.sha256(path.read_bytes()).hexdigest()
assert before.st_size >= 131072
rows = []


def run(label):
    receipt = base / ('current-large-pages-' + label + '.json.gz')
    command = [sys.executable, '-B', 'experiments/issue-784/release-inactive-repository-pages.py',
               '--receipt', str(receipt), '--gzip-receipt', '--minimum-file-bytes', '131072']
    with (base / ('current-large-pages-' + label + '.log')).open('xb') as output:
        subprocess.run(command, stdout=output, stderr=subprocess.STDOUT, check=True)
    row = json.loads(gzip.decompress(receipt.read_bytes()))
    assert row['minimumFileBytes'] == 131072
    assert all(file['bytes'] >= 131072 for file in row['files'])
    assert not any(file['path'].startswith('../') for file in row['files'])
    rows.append({'label': label, 'receipt': str(receipt), 'selected': len(row['files'])})
    return row


with path.open('rb') as source:
    with mmap.mmap(source.fileno(), 0, access=mmap.ACCESS_READ):
        active = run('active-control')
        assert str(path) in active['skipped']
        assert not any(row['path'] == str(path) for row in active['files'])
closed = run('closed-control')
assert any(row['path'] == str(path) and row['bytes'] == before.st_size for row in closed['files'])
after = path.stat()
for field in ['st_dev', 'st_ino', 'st_mode', 'st_uid', 'st_nlink',
              'st_size', 'st_mtime_ns', 'st_ctime_ns']:
    assert getattr(before, field) == getattr(after, field)
assert hashlib.sha256(path.read_bytes()).hexdigest() == digest
record = {'controls': rows, 'allPassed': True, 'unchangedCompleteFileSha256': digest,
          'activeFileSkipped': True, 'closedFileAdvised': True,
          'completeGateQualified': False}
with (base / 'current-large-pages-file-controls.json').open('x') as output:
    json.dump(record, output)
print(json.dumps(record))
