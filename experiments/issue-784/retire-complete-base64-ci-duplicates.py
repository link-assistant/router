"""Retire only inactive working files exactly retained in complete evidence."""
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path
import stat
import argparse

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--index', default='current-retained-duplicate-candidates.json')
parser.add_argument('--receipt', default='complete-ci-duplicates-retired-20261110.json.gz')
parser.add_argument('--decoded-limit', type=int, default=16 * 1024 * 1024)
args = parser.parse_args()
assert '/' not in args.index and '/' not in args.receipt
assert 0 < args.decoded_limit <= 64 * 1024 * 1024

base = Path('ci-logs/issue-784-restart-2')
candidates = json.loads((base / args.index).read_bytes())
candidates = {row['path']: row for row in candidates if row['archive'] is None}
selected, rows = set(), []


def identity(path):
    value = path.lstat()
    assert stat.S_ISREG(value.st_mode) and value.st_uid == os.getuid() and value.st_nlink == 1
    return [value.st_dev, value.st_ino, value.st_size, value.st_mtime_ns, value.st_ctime_ns]


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


for name, candidate in candidates.items():
    assert name.startswith('ci-logs/') and candidate['receipt'].startswith('docs/case-studies/issue-784/evidence/')
    path, receipt = Path(name), Path(candidate['receipt'])
    with gzip.open(receipt, 'rb') as stream:
        raw = stream.read(args.decoded_limit + 1)
        assert len(raw) <= args.decoded_limit and not stream.read(1)
    data = json.loads(raw)
    matches = [row for row in data['members']
               if row['path'] == name and row['sha256'] == candidate['sha256']]
    assert len(matches) == 1
    row = matches[0]
    original = base64.b64decode(row['base64'], validate=True)
    assert len(original) == row['bytes'] == candidate['bytes']
    assert hashlib.sha256(original).hexdigest() == candidate['sha256']
    original_identity = identity(path)
    assert path.read_bytes() == original and identity(path) == original_identity
    selected.add(tuple(original_identity[:2]))
    rows.append(dict(path=name, bytes=len(original), sha256=candidate['sha256'],
                     identity=original_identity, completeEvidence=str(receipt),
                     completeEvidenceSha256=digest(receipt), fullOriginalBytesCompared=True))


def inactive():
    for proc in Path('/proc').iterdir():
        if not proc.name.isdecimal():
            continue
        try:
            fds = list((proc / 'fd').iterdir())
        except (FileNotFoundError, PermissionError):
            continue
        for fd in fds:
            try:
                value = fd.stat()
            except (FileNotFoundError, ProcessLookupError):
                continue
            assert (value.st_dev, value.st_ino) not in selected
    for row in rows:
        assert identity(Path(row['path'])) == row['identity']
        assert digest(Path(row['path'])) == row['sha256']
        assert digest(Path(row['completeEvidence'])) == row['completeEvidenceSha256']


inactive()
receipt = Path('docs/case-studies/issue-784/evidence') / args.receipt
record = dict(schema='verified-complete-base64-working-copy-retirement-v1', rows=rows,
              completeOriginalBytesRetained=True, onlyInactiveTaskWorkingCopies=True,
              logicalBytesReclaimed=sum(row['bytes'] for row in rows))
raw = json.dumps(record).encode()
with receipt.open('xb') as stream:
    stream.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == raw
inactive()
for row in rows:
    Path(row['path']).unlink()
print(json.dumps(dict(receipt=str(receipt), files=len(rows),
                      logicalBytesReclaimed=record['logicalBytesReclaimed'])))
